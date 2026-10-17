package com.meditrack;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIf;
import org.testcontainers.DockerClientFactory;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers(disabledWithoutDocker = true)
class TestcontainersMySqlIntegrationTest {

    static boolean isDockerAvailable() {
        try {
            return DockerClientFactory.instance().isDockerAvailable();
        } catch (Throwable t) {
            return false;
        }
    }

    @Container
    @SuppressWarnings("resource")
    private static final MySQLContainer<?> mysqlContainer = new MySQLContainer<>("mysql:8.0.36")
            .withDatabaseName("meditrack_integration_test")
            .withUsername("meditrack_user")
            .withPassword("TestPass123!");

    @Test
    @DisplayName("Verify Testcontainers spins up real disposable MySQL 8 container and executes SQL DDL/DML")
    @EnabledIf("isDockerAvailable")
    void testRealMySqlContainerStartupAndConnectivity() throws Exception {
        assertTrue(mysqlContainer.isRunning(), "MySQL container must be running");

        String jdbcUrl = mysqlContainer.getJdbcUrl();
        String username = mysqlContainer.getUsername();
        String password = mysqlContainer.getPassword();

        assertNotNull(jdbcUrl);
        assertTrue(jdbcUrl.startsWith("jdbc:mysql://"));

        // Connect directly via JDBC driver to verify real MySQL engine execution
        try (Connection conn = DriverManager.getConnection(jdbcUrl, username, password);
             Statement stmt = conn.createStatement()) {

            stmt.execute("CREATE TABLE inventory_test (id INT PRIMARY KEY AUTO_INCREMENT, sku VARCHAR(50), stock INT);");
            stmt.execute("INSERT INTO inventory_test (sku, stock) VALUES ('MED-TEST-001', 50);");

            try (ResultSet rs = stmt.executeQuery("SELECT sku, stock, VERSION() as ver FROM inventory_test;")) {
                assertTrue(rs.next(), "Must read inserted row");
                assertEquals("MED-TEST-001", rs.getString("sku"));
                assertEquals(50, rs.getInt("stock"));
                String dbVersion = rs.getString("ver");
                assertNotNull(dbVersion);
                assertTrue(dbVersion.contains("8.0") || dbVersion.contains("MySQL"), "DB version must be MySQL 8: " + dbVersion);
            }
        }
    }

    @Test
    @DisplayName("Verify Docker availability diagnostic for Testcontainers environment")
    void testDockerEnvironmentDiagnostic() {
        boolean available = isDockerAvailable();
        System.out.println("[TESTCONTAINERS DIAGNOSTIC] Docker daemon available on host: " + available);
        if (!available) {
            System.out.println("[TESTCONTAINERS NOTICE] Docker is not available in current process environment. MySQLContainer tests require active Docker Desktop / dockerd socket.");
        }
        assertDoesNotThrow(TestcontainersMySqlIntegrationTest::isDockerAvailable);
    }
}
