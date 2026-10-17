package com.meditrack.inventory;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ProductBatchRepository extends JpaRepository<ProductBatch, Long> {

    @Query("SELECT b FROM ProductBatch b WHERE b.product.id = :productId AND b.status = 'ACTIVE' " +
           "AND b.expiryDate > :minDate AND (b.quantityAvailable - b.quantityReserved) > 0 " +
           "ORDER BY b.expiryDate ASC")
    List<ProductBatch> findAvailableBatchesFEFO(@Param("productId") Long productId,
                                               @Param("minDate") LocalDate minDate);

    List<ProductBatch> findByProductId(Long productId);

    @Query("SELECT COALESCE(SUM(b.quantityAvailable - b.quantityReserved), 0) FROM ProductBatch b " +
           "WHERE b.product.id = :productId AND b.status = 'ACTIVE' AND b.expiryDate > CURRENT_DATE")
    Integer getTotalAvailableStock(@Param("productId") Long productId);

    @Query("SELECT b FROM ProductBatch b WHERE b.status = 'ACTIVE' AND b.expiryDate BETWEEN CURRENT_DATE AND :thresholdDate ORDER BY b.expiryDate ASC")
    List<ProductBatch> findNearExpiryBatches(@Param("thresholdDate") LocalDate thresholdDate);

    @Query("SELECT b FROM ProductBatch b WHERE b.status = 'ACTIVE' AND b.expiryDate <= CURRENT_DATE")
    List<ProductBatch> findExpiredBatches();
}
