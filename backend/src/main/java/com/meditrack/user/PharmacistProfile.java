package com.meditrack.user;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "pharmacist_profile")
public class PharmacistProfile {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "license_number", nullable = false)
    private String licenseNumber;

    @Column(name = "license_valid_till")
    private LocalDate licenseValidTill;

    @Column(name = "pharmacy_id")
    private Long pharmacyId;

    public PharmacistProfile() {}

    public PharmacistProfile(Long userId, String licenseNumber, LocalDate licenseValidTill, Long pharmacyId) {
        this.userId = userId;
        this.licenseNumber = licenseNumber;
        this.licenseValidTill = licenseValidTill;
        this.pharmacyId = pharmacyId;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getLicenseNumber() { return licenseNumber; }
    public void setLicenseNumber(String licenseNumber) { this.licenseNumber = licenseNumber; }

    public LocalDate getLicenseValidTill() { return licenseValidTill; }
    public void setLicenseValidTill(LocalDate licenseValidTill) { this.licenseValidTill = licenseValidTill; }

    public Long getPharmacyId() { return pharmacyId; }
    public void setPharmacyId(Long pharmacyId) { this.pharmacyId = pharmacyId; }
}
