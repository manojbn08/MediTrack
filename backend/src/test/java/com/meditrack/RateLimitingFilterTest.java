package com.meditrack;

import com.meditrack.security.RateLimitingFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitingFilterTest {

    private final RateLimitingFilter filter = new RateLimitingFilter();

    @Test
    @DisplayName("Verify Bucket4j enforces 5 requests/minute on /api/auth/login and returns 429 on 6th request")
    void testLoginRateLimiting() throws ServletException, IOException {
        String clientIp = "192.168.1.100";

        // First 5 requests should succeed (status 200)
        for (int i = 1; i <= 5; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            FilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus(), "Request " + i + " must pass through filter");
        }

        // 6th request must trigger rate limiter (status 429 TOO_MANY_REQUESTS)
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/login");
        blockedRequest.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, chain);

        assertEquals(429, blockedResponse.getStatus(), "6th request within 1 minute must return HTTP 429");
        assertEquals("60", blockedResponse.getHeader("X-Rate-Limit-Retry-After-Seconds"));
        assertTrue(blockedResponse.getContentAsString().contains("Too many login attempts"));
    }

    @Test
    @DisplayName("Verify Bucket4j enforces 3 requests/10-minutes on /api/auth/register and returns 429 on 4th request")
    void testRegisterRateLimiting() throws ServletException, IOException {
        String clientIp = "192.168.1.200";

        // First 3 requests pass
        for (int i = 1; i <= 3; i++) {
            MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/register");
            request.setRemoteAddr(clientIp);
            MockHttpServletResponse response = new MockHttpServletResponse();
            FilterChain chain = new MockFilterChain();

            filter.doFilter(request, response, chain);
            assertEquals(200, response.getStatus(), "Registration " + i + " must pass");
        }

        // 4th request must be blocked
        MockHttpServletRequest blockedRequest = new MockHttpServletRequest("POST", "/api/auth/register");
        blockedRequest.setRemoteAddr(clientIp);
        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        FilterChain chain = new MockFilterChain();

        filter.doFilter(blockedRequest, blockedResponse, chain);

        assertEquals(429, blockedResponse.getStatus(), "4th registration request must return HTTP 429");
        assertTrue(blockedResponse.getContentAsString().contains("Too many registration attempts"));
    }
}
