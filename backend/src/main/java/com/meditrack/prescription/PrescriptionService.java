package com.meditrack.prescription;

import com.meditrack.common.BusinessException;
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

    public PrescriptionService(PrescriptionRepository prescriptionRepository,
                               FileStorageService fileStorageService) {
        this.prescriptionRepository = prescriptionRepository;
        this.fileStorageService = fileStorageService;
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

        return prescriptionRepository.save(prescription);
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
        return prescriptionRepository.save(prescription);
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
        return prescriptionRepository.save(prescription);
    }
}
