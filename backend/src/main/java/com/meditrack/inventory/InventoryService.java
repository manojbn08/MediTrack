package com.meditrack.inventory;

import com.meditrack.catalog.Product;
import com.meditrack.catalog.ProductRepository;
import com.meditrack.common.BusinessException;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class InventoryService {

    private final ProductBatchRepository batchRepository;
    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;

    public InventoryService(ProductBatchRepository batchRepository,
                            StockMovementRepository stockMovementRepository,
                            ProductRepository productRepository) {
        this.batchRepository = batchRepository;
        this.stockMovementRepository = stockMovementRepository;
        this.productRepository = productRepository;
    }

    public static class BatchAllocation {
        private final ProductBatch batch;
        private final int allocatedQuantity;

        public BatchAllocation(ProductBatch batch, int allocatedQuantity) {
            this.batch = batch;
            this.allocatedQuantity = allocatedQuantity;
        }

        public ProductBatch getBatch() { return batch; }
        public int getAllocatedQuantity() { return allocatedQuantity; }
    }

    @Transactional
    public List<BatchAllocation> allocateFEFO(Long productId, int quantityRequested) {
        LocalDate minShelfLife = LocalDate.now().plusDays(30);
        List<ProductBatch> batches = batchRepository.findAvailableBatchesFEFO(productId, minShelfLife);

        List<BatchAllocation> allocations = new ArrayList<>();
        int remaining = quantityRequested;

        for (ProductBatch batch : batches) {
            int availableInBatch = batch.getQuantityAvailable() - batch.getQuantityReserved();
            if (availableInBatch <= 0) continue;

            int take = Math.min(remaining, availableInBatch);
            batch.setQuantityReserved(batch.getQuantityReserved() + take);
            batchRepository.save(batch);

            stockMovementRepository.save(new StockMovement(
                    batch.getId(), "RESERVE", take, "ORDER_RESERVATION", null, "Soft reserve on order checkout"
            ));

            allocations.add(new BatchAllocation(batch, take));
            remaining -= take;
            if (remaining == 0) break;
        }

        if (remaining > 0) {
            throw new BusinessException("Insufficient stock available for product id: " + productId, HttpStatus.CONFLICT);
        }

        return allocations;
    }

    @Transactional
    public void confirmDeduction(Long batchId, int quantity, Long orderId) {
        ProductBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new BusinessException("Batch not found", HttpStatus.NOT_FOUND));

        batch.setQuantityReserved(Math.max(0, batch.getQuantityReserved() - quantity));
        batch.setQuantityAvailable(Math.max(0, batch.getQuantityAvailable() - quantity));
        if (batch.getQuantityAvailable() == 0) {
            batch.setStatus(BatchStatus.DEPLETED);
        }
        batchRepository.save(batch);

        stockMovementRepository.save(new StockMovement(
                batch.getId(), "SALE_OUT", quantity, "ORDER", orderId, "Pharmacist fulfilled and packed"
        ));
    }

    @Transactional
    public void releaseReservedStock(Long batchId, int quantity, Long orderId) {
        ProductBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new BusinessException("Batch not found", HttpStatus.NOT_FOUND));

        batch.setQuantityReserved(Math.max(0, batch.getQuantityReserved() - quantity));
        batchRepository.save(batch);

        stockMovementRepository.save(new StockMovement(
                batch.getId(), "RELEASE", quantity, "ORDER_CANCEL", orderId, "Order cancelled or payment timed out"
        ));
    }

    @Transactional
    public ProductBatch addBatch(Long productId, String batchNumber, LocalDate expiryDate,
                                 Double purchasePrice, Double sellingPrice, int quantity) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new BusinessException("Product not found", HttpStatus.NOT_FOUND));

        ProductBatch batch = new ProductBatch();
        batch.setProduct(product);
        batch.setBatchNumber(batchNumber);
        batch.setExpiryDate(expiryDate);
        batch.setPurchasePrice(purchasePrice);
        batch.setSellingPrice(sellingPrice);
        batch.setQuantityReceived(quantity);
        batch.setQuantityAvailable(quantity);
        batch.setQuantityReserved(0);
        batch.setStatus(BatchStatus.ACTIVE);
        batch = batchRepository.save(batch);

        stockMovementRepository.save(new StockMovement(
                batch.getId(), "PURCHASE_IN", quantity, "MANUAL_STOCK_IN", null, "Initial batch entry"
        ));

        return batch;
    }

    @Scheduled(cron = "0 30 0 * * ?") // Daily at 00:30
    @Transactional
    public void markExpiredBatches() {
        List<ProductBatch> expired = batchRepository.findExpiredBatches();
        for (ProductBatch batch : expired) {
            batch.setStatus(BatchStatus.EXPIRED);
            batchRepository.save(batch);
            stockMovementRepository.save(new StockMovement(
                    batch.getId(), "EXPIRED_OUT", batch.getQuantityAvailable(), "SCHEDULER", null, "Expired quarantined"
            ));
        }
    }
}
