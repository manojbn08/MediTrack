package com.meditrack.security;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {

    // Store token -> expiry timestamp in epoch milliseconds
    private final Map<String, Long> blacklistedTokens = new ConcurrentHashMap<>();

    public void blacklistToken(String token, long expiryEpochMilli) {
        if (token != null && !token.isBlank()) {
            blacklistedTokens.put(token, expiryEpochMilli);
        }
    }

    public boolean isBlacklisted(String token) {
        if (token == null || !blacklistedTokens.containsKey(token)) {
            return false;
        }
        long expiry = blacklistedTokens.get(token);
        if (Instant.now().toEpochMilli() > expiry) {
            blacklistedTokens.remove(token);
            return false;
        }
        return true;
    }
}
