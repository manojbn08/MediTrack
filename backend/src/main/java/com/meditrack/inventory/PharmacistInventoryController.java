package com.meditrack.inventory;

import com.meditrack.catalog.Product;
import com.meditrack.catalog.ProductRepository;
import com.meditrack.common.ApiResponse;
import com.meditrack.order.OrderReturn;
import com.meditrack.order.OrderReturnRepository;
import com.meditrack.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pharmacist")
public class PharmacistInventoryController {

    private final ProductRepository productRepository;
    private final ProductBatchRepository batchRepository;
    private final InventoryService inventoryService;
    private final OrderReturnRepository orderReturnRepository;

    public PharmacistInventoryController(ProductRepository productRepository,
                                         ProductBatchRepository batchRepository,
                                         InventoryService inventoryService,
                                         OrderReturnRepository orderReturnRepository) {
        this.productRepository = productRepository;
        this.batchRepository = batchRepository;
        this.inventoryService = inventoryService;
        this.orderReturnRepository = orderReturnRepository;
    }

    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<List<Product>>> getAllInventory() {
        List<Product> products = productRepository.findAll();
        for (Product p : products) {
            Integer stock = batchRepository.getTotalAvailableStock(p.getId());
            p.setStockAvailable(stock != null ? stock : 0);
        }
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    @GetMapping("/batches")
    public ResponseEntity<ApiResponse<List<ProductBatch>>> getBatches(
            @RequestParam(required = false) Long productId) {
        List<ProductBatch> batches = (productId != null) ?
                batchRepository.findByProductId(productId) :
                batchRepository.findAll();
        return ResponseEntity.ok(ApiResponse.ok(batches));
    }

    @PostMapping("/batches")
    public ResponseEntity<ApiResponse<ProductBatch>> addBatch(@RequestBody Map<String, Object> body) {
        Long productId = Long.valueOf(body.get("productId").toString());
        String batchNumber = body.get("batchNumber").toString();
        LocalDate expiryDate = LocalDate.parse(body.get("expiryDate").toString());
        Double purchasePrice = Double.valueOf(body.get("purchasePrice").toString());
        Double sellingPrice = Double.valueOf(body.get("sellingPrice").toString());
        int quantity = Integer.parseInt(body.get("quantity").toString());

        ProductBatch batch = inventoryService.addBatch(productId, batchNumber, expiryDate, purchasePrice, sellingPrice, quantity);
        return ResponseEntity.ok(ApiResponse.ok("Batch added successfully", batch));
    }

    @GetMapping("/alerts/near-expiry")
    public ResponseEntity<ApiResponse<List<ProductBatch>>> getNearExpiry() {
        LocalDate threshold = LocalDate.now().plusDays(60);
        List<ProductBatch> batches = batchRepository.findNearExpiryBatches(threshold);
        return ResponseEntity.ok(ApiResponse.ok(batches));
    }

    @GetMapping("/alerts/low-stock")
    public ResponseEntity<ApiResponse<List<Product>>> getLowStock() {
        List<Product> products = productRepository.findAll().stream()
                .peek(p -> {
                    Integer stock = batchRepository.getTotalAvailableStock(p.getId());
                    p.setStockAvailable(stock != null ? stock : 0);
                })
                .filter(p -> p.getStockAvailable() <= p.getReorderLevel())
                .toList();
        return ResponseEntity.ok(ApiResponse.ok(products));
    }

    @GetMapping("/returns")
    public ResponseEntity<com.meditrack.common.ApiResponse<List<OrderReturn>>> getPendingReturns() {
        List<OrderReturn> returns = orderReturnRepository.findByStatusOrderByCreatedAtAsc(OrderReturn.ReturnStatus.PENDING_INSPECTION);
        return ResponseEntity.ok(com.meditrack.common.ApiResponse.ok(returns));
    }

    @PostMapping({"/returns/{id}/inspect", "/returns/{id}/approve"})
    public ResponseEntity<com.meditrack.common.ApiResponse<OrderReturn>> inspectReturn(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        OrderReturn ret = orderReturnRepository.findById(id)
                .orElseThrow(() -> new com.meditrack.common.BusinessException("Return request not found", org.springframework.http.HttpStatus.NOT_FOUND));

        String decision = body != null ? body.getOrDefault("decision", "APPROVED") : "APPROVED";
        if ("REJECTED".equalsIgnoreCase(decision)) {
            ret.setStatus(OrderReturn.ReturnStatus.REJECTED);
        } else {
            ret.setStatus(OrderReturn.ReturnStatus.APPROVED_REFUNDED);
        }
        ret.setInspectedByPharmacistId(principal != null ? principal.getId() : 1L);
        ret.setPharmacistNotes(body != null ? body.get("notes") : "Inspected and approved by pharmacist");
        orderReturnRepository.save(ret);

        return ResponseEntity.ok(com.meditrack.common.ApiResponse.ok("Return marked as " + ret.getStatus(), ret));
    }

    @PostMapping("/returns/{id}/reject")
    public ResponseEntity<com.meditrack.common.ApiResponse<OrderReturn>> rejectReturn(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        OrderReturn ret = orderReturnRepository.findById(id)
                .orElseThrow(() -> new com.meditrack.common.BusinessException("Return request not found", org.springframework.http.HttpStatus.NOT_FOUND));

        ret.setStatus(OrderReturn.ReturnStatus.REJECTED);
        ret.setInspectedByPharmacistId(principal != null ? principal.getId() : 1L);
        ret.setPharmacistNotes(body != null ? body.getOrDefault("reason", "Item rejected upon inspection") : "Item rejected upon inspection");
        orderReturnRepository.save(ret);

        return ResponseEntity.ok(com.meditrack.common.ApiResponse.ok("Return rejected", ret));
    }
}
