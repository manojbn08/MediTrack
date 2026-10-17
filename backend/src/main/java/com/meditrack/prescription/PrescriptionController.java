package com.meditrack.prescription;

import com.meditrack.common.ApiResponse;
import com.meditrack.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/customer/prescriptions")
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    public PrescriptionController(PrescriptionService prescriptionService) {
        this.prescriptionService = prescriptionService;
    }

    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<ApiResponse<Prescription>> upload(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "patientName", required = false) String patientName,
            @RequestParam(value = "doctorName", required = false) String doctorName) {
        Prescription prescription = prescriptionService.uploadPrescription(principal.getId(), file, patientName, doctorName);
        return ResponseEntity.ok(ApiResponse.ok("Prescription uploaded successfully", prescription));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Prescription>>> getMyPrescriptions(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<Prescription> list = prescriptionService.getUserPrescriptions(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Prescription>> getPrescription(
            @PathVariable Long id) {
        Prescription prescription = prescriptionService.getPrescriptionById(id);
        return ResponseEntity.ok(ApiResponse.ok(prescription));
    }
}
