package com.meditrack.prescription;

import com.meditrack.common.AuditLogService;
import com.meditrack.common.BusinessException;
import com.meditrack.inventory.InventoryService;
import com.meditrack.notification.EmailService;
import com.meditrack.order.*;
import com.meditrack.user.User;
import com.meditrack.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final FileStorageService fileStorageService;
    private final OrderRepository orderRepository;
    private final OrderStateMachine orderStateMachine;
    private final InventoryService inventoryService;
    private final RealtimeTrackingService realtimeTrackingService;
    private final EmailService emailService;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    public PrescriptionService(PrescriptionRepository prescriptionRepository,
                               FileStorageService fileStorageService,
                               OrderRepository orderRepository,
                               OrderStateMachine orderStateMachine,
                               InventoryService inventoryService,
                               RealtimeTrackingService realtimeTrackingService,
                               EmailService emailService,
                               UserRepository userRepository,
                               AuditLogService auditLogService) {
        this.prescriptionRepository = prescriptionRepository;
        this.fileStorageService = fileStorageService;
        this.orderRepository = orderRepository;
        this.orderStateMachine = orderStateMachine;
        this.inventoryService = inventoryService;
        this.realtimeTrackingService = realtimeTrackingService;
        this.emailService = emailService;
        this.userRepository = userRepository;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public Prescription uploadPrescription(Long userId, MultipartFile file, String patientName, String doctorName) {
        String fileUrl = fileStorageService.storeFile(file);

        Prescription prescription = new Prescription();
        prescription.setUserId(userId);
        prescription.setFileUrl(fileUrl);
        prescription.setPatientName(patientName != null && !patientName.isBlank() ? patientName : "Self");
        prescription.setDoctorName(doctorName != null && !doctorName.isBlank() ? doctorName : "Dr. Consultation");
        prescription.setDoctorRegNo("REG-MCI-2026-99");
        prescription.setIssuedOn(LocalDate.now());
        prescription.setValidTill(LocalDate.now().plusMonths(6));
        prescription.setStatus(PrescriptionStatus.PENDING);
        prescription.setUploadedAt(LocalDateTime.now());

        Prescription saved = prescriptionRepository.save(prescription);

        auditLogService.logAction(
                userId,
                "ROLE_CUSTOMER",
                "UPLOAD_PRESCRIPTION",
                "PRESCRIPTION",
                saved.getId(),
                "Uploaded prescription for patient: " + saved.getPatientName(),
                "127.0.0.1"
        );

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Prescription> getUserPrescriptions(Long userId) {
        return prescriptionRepository.findByUserIdOrderByUploadedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<Prescription> getPendingQueue() {
        return prescriptionRepository.findByStatusOrderByUploadedAtAsc(PrescriptionStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public Prescription getPrescriptionById(Long id) {
        return prescriptionRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Prescription not found with id: " + id, HttpStatus.NOT_FOUND));
    }

    @Transactional
    public Prescription approvePrescription(Long id, Long pharmacistId, String doctorRegNo, String notes) {
        Prescription prescription = getPrescriptionById(id);
        prescription.setStatus(PrescriptionStatus.APPROVED);
        prescription.setReviewedBy(pharmacistId);
        prescription.setReviewedAt(LocalDateTime.now());
        if (doctorRegNo != null && !doctorRegNo.isBlank()) {
            prescription.setDoctorRegNo(doctorRegNo);
        }
        Prescription saved = prescriptionRepository.save(prescription);

        // 1. Advance linked orders from PRESCRIPTION_PENDING to CONFIRMED
        List<Order> linkedOrders = orderRepository.findByPrescriptionId(id);
        for (Order order : linkedOrders) {
            if (order.getStatus() == OrderStatus.PRESCRIPTION_PENDING) {
                order.setAssignedPharmacistId(pharmacistId);
                orderStateMachine.transition(order, OrderStatus.CONFIRMED, "PHARMACIST",
                        "Prescription verified and approved by pharmacist");
                orderRepository.save(order);

                realtimeTrackingService.publishOrderStatus(
                        order.getId(),
                        order.getOrderNumber(),
                        OrderStatus.CONFIRMED.name(),
                        "Prescription approved by pharmacist. Order is confirmed and queued for fulfillment."
                );
                realtimeTrackingService.publishNewOrderToPharmacists(order);
            }
        }

        // 2. Dispatch email notification to patient
        if (prescription.getUserId() != null) {
            userRepository.findById(prescription.getUserId()).ifPresent(user -> {
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    emailService.sendPrescriptionStatusNotification(
                            user.getEmail(),
                            prescription.getPatientName(),
                            "APPROVED",
                            notes != null && !notes.isBlank() ? notes : "Prescription verified and clinically approved."
                    );
                }
            });
        }

        // 3. Record audit log
        auditLogService.logAction(
                pharmacistId,
                "ROLE_PHARMACIST",
                "APPROVE_PRESCRIPTION",
                "PRESCRIPTION",
                saved.getId(),
                "Prescription #" + saved.getId() + " approved. Linked orders transitioned to CONFIRMED.",
                "127.0.0.1"
        );

        return saved;
    }

    @Transactional
    public Prescription rejectPrescription(Long id, Long pharmacistId, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new BusinessException("Rejection reason is mandatory as per pharmacy regulations", HttpStatus.BAD_REQUEST);
        }
        Prescription prescription = getPrescriptionById(id);
        prescription.setStatus(PrescriptionStatus.REJECTED);
        prescription.setReviewedBy(pharmacistId);
        prescription.setReviewedAt(LocalDateTime.now());
        prescription.setRejectReason(reason);
        Prescription saved = prescriptionRepository.save(prescription);

        // 1. Reject linked orders and release reserved stock
        List<Order> linkedOrders = orderRepository.findByPrescriptionId(id);
        for (Order order : linkedOrders) {
            if (order.getStatus() == OrderStatus.PRESCRIPTION_PENDING) {
                order.setAssignedPharmacistId(pharmacistId);
                orderStateMachine.transition(order, OrderStatus.REJECTED, "PHARMACIST",
                        "Prescription rejected by pharmacist: " + reason);

                for (OrderItem oi : order.getItems()) {
                    if (oi.getBatchId() != null) {
                        inventoryService.releaseReservedStock(oi.getBatchId(), oi.getQuantity(), order.getId());
                    }
                }
                orderRepository.save(order);

                realtimeTrackingService.publishOrderStatus(
                        order.getId(),
                        order.getOrderNumber(),
                        OrderStatus.REJECTED.name(),
                        "Prescription rejected: " + reason
                );
            }
        }

        // 2. Dispatch email notification
        if (prescription.getUserId() != null) {
            userRepository.findById(prescription.getUserId()).ifPresent(user -> {
                if (user.getEmail() != null && !user.getEmail().isBlank()) {
                    emailService.sendPrescriptionStatusNotification(
                            user.getEmail(),
                            prescription.getPatientName(),
                            "REJECTED",
                            reason
                    );
                }
            });
        }

        // 3. Record audit log
        auditLogService.logAction(
                pharmacistId,
                "ROLE_PHARMACIST",
                "REJECT_PRESCRIPTION",
                "PRESCRIPTION",
                saved.getId(),
                "Prescription #" + saved.getId() + " rejected. Reason: " + reason,
                "127.0.0.1"
        );

        return saved;
    }
}
