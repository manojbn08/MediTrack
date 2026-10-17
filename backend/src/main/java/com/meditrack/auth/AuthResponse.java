package com.meditrack.auth;

import java.util.List;

public class AuthResponse {
    private String token;
    private String refreshToken;
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private List<String> roles;
    private String status;
    private boolean requiresOtp = false;
    private String message;

    public AuthResponse() {}

    public AuthResponse(String token, Long id, String fullName, String email, String phone, List<String> roles) {
        this.token = token;
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.roles = roles;
        this.status = "ACTIVE";
    }

    public AuthResponse(String token, String refreshToken, Long id, String fullName, String email, String phone, List<String> roles, String status) {
        this.token = token;
        this.refreshToken = refreshToken;
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.roles = roles;
        this.status = status;
    }

    public static AuthResponse pendingOtp(String email, String message) {
        AuthResponse res = new AuthResponse();
        res.setEmail(email);
        res.setStatus("PENDING_OTP");
        res.setRequiresOtp(true);
        res.setMessage(message);
        return res;
    }

    public static AuthResponse pendingApproval(String email, String message) {
        AuthResponse res = new AuthResponse();
        res.setEmail(email);
        res.setStatus("PENDING_APPROVAL");
        res.setRequiresOtp(false);
        res.setMessage(message);
        return res;
    }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getRefreshToken() { return refreshToken; }
    public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isRequiresOtp() { return requiresOtp; }
    public void setRequiresOtp(boolean requiresOtp) { this.requiresOtp = requiresOtp; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
