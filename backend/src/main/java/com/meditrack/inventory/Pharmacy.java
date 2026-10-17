package com.meditrack.inventory;

import jakarta.persistence.*;

@Entity
@Table(name = "pharmacies")
public class Pharmacy {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "drug_license_no")
    private String drugLicenseNo;

    private String gstin;
    private String phone;
    private String email;
    private String address;
    private String city;
    private String state;
    private String pincode;

    @Column(nullable = false)
    private Double latitude = 12.9716;

    @Column(nullable = false)
    private Double longitude = 77.5946;

    @Column(name = "service_radius_km")
    private Double serviceRadiusKm = 15.0;

    @Column(name = "is_active")
    private boolean isActive = true;

    public Pharmacy() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDrugLicenseNo() { return drugLicenseNo; }
    public void setDrugLicenseNo(String drugLicenseNo) { this.drugLicenseNo = drugLicenseNo; }

    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Double getServiceRadiusKm() { return serviceRadiusKm; }
    public void setServiceRadiusKm(Double serviceRadiusKm) { this.serviceRadiusKm = serviceRadiusKm; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }
}
