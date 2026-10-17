package com.meditrack.user;

import com.meditrack.common.ApiResponse;
import com.meditrack.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer")
public class UserController {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public UserController(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/addresses")
    public ResponseEntity<ApiResponse<List<Address>>> getAddresses(@AuthenticationPrincipal UserPrincipal principal) {
        List<Address> addresses = addressRepository.findByUserId(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(addresses));
    }

    @PostMapping("/addresses")
    public ResponseEntity<ApiResponse<Address>> addAddress(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Address address) {
        address.setUserId(principal.getId());
        Address saved = addressRepository.save(address);
        return ResponseEntity.ok(ApiResponse.ok("Address saved", saved));
    }
}
