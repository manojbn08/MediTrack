package com.meditrack.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> loginBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> registerBuckets = new ConcurrentHashMap<>();
    private final Map<String, Bucket> otpBuckets = new ConcurrentHashMap<>();

    private Bucket createLoginBucket() {
        // 5 requests per minute per IP
        Bandwidth limit = Bandwidth.builder()
                .capacity(5)
                .refillGreedy(5, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createRegisterBucket() {
        // 3 requests per 10 minutes per IP
        Bandwidth limit = Bandwidth.builder()
                .capacity(3)
                .refillGreedy(3, Duration.ofMinutes(10))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private Bucket createOtpBucket() {
        // 10 requests per minute per IP
        Bandwidth limit = Bandwidth.builder()
                .capacity(10)
                .refillGreedy(10, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String path = request.getRequestURI();
        String clientIp = extractClientIp(request);

        if (path.startsWith("/api/auth/login")) {
            Bucket bucket = loginBuckets.computeIfAbsent(clientIp, k -> createLoginBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitError(response, "Too many login attempts. Please wait 60 seconds before trying again.");
                return;
            }
        } else if (path.startsWith("/api/auth/register")) {
            Bucket bucket = registerBuckets.computeIfAbsent(clientIp, k -> createRegisterBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitError(response, "Too many registration attempts from this IP. Please try again later.");
                return;
            }
        } else if (path.startsWith("/api/auth/verify-otp")) {
            Bucket bucket = otpBuckets.computeIfAbsent(clientIp, k -> createOtpBucket());
            if (!bucket.tryConsume(1)) {
                sendRateLimitError(response, "Too many OTP verification attempts. Please wait 60 seconds before trying again.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private void sendRateLimitError(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("X-Rate-Limit-Retry-After-Seconds", "60");
        String json = String.format(
                "{\"success\":false,\"statusCode\":429,\"message\":\"%s\",\"data\":null,\"timestamp\":\"%s\"}",
                message, LocalDateTime.now()
        );
        response.getWriter().write(json);
    }

    private String extractClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isBlank()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
