package com.meditrack.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Async
    public void logAction(Long actorId, String actorRole, String action, String entityType, Long entityId, String details, String ipAddress) {
        try {
            AuditLog auditLog = new AuditLog(actorId, actorRole, action, entityType, entityId, details, ipAddress);
            auditLogRepository.save(auditLog);
            log.info("[AUDIT LOGGED] Action: {}, Entity: {}/{}, Actor: {} ({})", action, entityType, entityId, actorId, actorRole);
        } catch (Exception ex) {
            log.error("[AUDIT LOG FAILED] Action: {}, Error: {}", action, ex.getMessage());
        }
    }

    public List<AuditLog> getRecentLogs() {
        return auditLogRepository.findAllByOrderByCreatedAtDesc();
    }
}
