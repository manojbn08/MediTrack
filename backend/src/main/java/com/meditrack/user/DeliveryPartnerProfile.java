package com.meditrack.user;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "delivery_partner_profile")
public class DeliveryPartnerProfile {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "vehicle_type")
    private String vehicleType = "BIKE";

    @Column(name = "vehicle_number")
    private String vehicleNumber;

    @Column(name = "driving_license_no")
    private String drivingLicenseNo;

    @Column(name = "id_proof_url")
    private String idProofUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status")
    private UserStatus approvalStatus = UserStatus.APPROVED;

    @Column(name = "is_online")
    private boolean isOnline = true;

    @Column(name = "current_lat")
    private Double currentLat = 12.9716;

    @Column(name = "current_lng")
    private Double currentLng = 77.5946;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt = LocalDateTime.now();

    private Double rating = 5.0;

    public DeliveryPartnerProfile() {}

    public DeliveryPartnerProfile(Long userId, String vehicleType, String vehicleNumber, String drivingLicenseNo) {
        this.userId = userId;
        this.vehicleType = vehicleType;
        this.vehicleNumber = vehicleNumber;
        this.drivingLicenseNo = drivingLicenseNo;
        this.approvalStatus = UserStatus.APPROVED;
        this.isOnline = true;
        this.currentLat = 12.9716;
        this.currentLng = 77.5946;
        this.lastLocationAt = LocalDateTime.now();
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getVehicleType() { return vehicleType; }
    public void setVehicleType(String vehicleType) { this.vehicleType = vehicleType; }

    public String getVehicleNumber() { return vehicleNumber; }
    public void setVehicleNumber(String vehicleNumber) { this.vehicleNumber = vehicleNumber; }

    public String getDrivingLicenseNo() { return drivingLicenseNo; }
    public void setDrivingLicenseNo(String drivingLicenseNo) { this.drivingLicenseNo = drivingLicenseNo; }

    public String getIdProofUrl() { return idProofUrl; }
    public void setIdProofUrl(String idProofUrl) { this.idProofUrl = idProofUrl; }

    public UserStatus getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(UserStatus approvalStatus) { this.approvalStatus = approvalStatus; }

    public boolean isOnline() { return isOnline; }
    public void setOnline(boolean online) { isOnline = online; }

    public Double getCurrentLat() { return currentLat; }
    public void setCurrentLat(Double currentLat) { this.currentLat = currentLat; }

    public Double getCurrentLng() { return currentLng; }
    public void setCurrentLng(Double currentLng) { this.currentLng = currentLng; }

    public LocalDateTime getLastLocationAt() { return lastLocationAt; }
    public void setLastLocationAt(LocalDateTime lastLocationAt) { this.lastLocationAt = lastLocationAt; }

    public Double getRating() { return rating; }
    public void setRating(Double rating) { this.rating = rating; }
}
