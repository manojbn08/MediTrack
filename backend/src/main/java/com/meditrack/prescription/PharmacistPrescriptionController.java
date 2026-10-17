package com.meditrack.prescription;

import com.meditrack.common.ApiResponse;
import com.meditrack.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pharmacist/prescriptions")
public class PharmacistPrescriptionController {

    private final PrescriptionService prescriptionService;

    public PharmacistPrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Prescription>>> getQueue(
            @RequestParam(defaultValue = "PENDING") String status) {
        List<Prescription> queue = prescriptionService.getPendingQueue();
        return ResponseEntity.ok(ApiResponse.ok(queue));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Prescription>> getPrescription(@PathVariable Long id) {
        Prescription prescription = prescriptionService.getPrescriptionById(id);
        return ResponseEntity.ok(ApiResponse.ok(prescription));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<ApiResponse<Prescription>> approve(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        String regNo = body != null ? body.get("doctorRegNo") : null;
        String notes = body != null ? body.get("notes") : null;
        Prescription prescription = prescriptionService.approvePrescription(id, principal.getId(), regNo, notes);
        return ResponseEntity.ok(ApiResponse.ok("Prescription approved", prescription));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<Prescription>> reject(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body != null ? body.get("reason") : null;
        Prescription prescription = prescriptionService.rejectPrescription(id, principal.getId(), reason);
        return ResponseEntity.ok(ApiResponse.ok("Prescription rejected", prescription));
    }
}
