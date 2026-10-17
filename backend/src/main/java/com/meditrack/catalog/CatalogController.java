package com.meditrack.catalog;

import com.meditrack.common.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

    private final CatalogService catalogService;
    private final ProductMapper productMapper;

    public CatalogController(CatalogService catalogService, ProductMapper productMapper) {
        this.catalogService = catalogService;
        this.productMapper = productMapper;
    }

    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<com.meditrack.catalog.dto.ProductResponseDto>>> getProducts(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) Boolean rx) {
        List<Product> products = catalogService.getProducts(q, category, rx);
        return ResponseEntity.ok(ApiResponse.ok(productMapper.toDtoList(products)));
    }

    @GetMapping("/products/{id}")
    public ResponseEntity<ApiResponse<com.meditrack.catalog.dto.ProductResponseDto>> getProduct(@PathVariable Long id) {
        Product product = catalogService.getProductById(id);
        return ResponseEntity.ok(ApiResponse.ok(productMapper.toDto(product)));
    }

    @GetMapping("/products/{id}/substitutes")
    public ResponseEntity<ApiResponse<List<com.meditrack.catalog.dto.ProductResponseDto>>> getSubstitutes(@PathVariable Long id) {
        List<Product> substitutes = catalogService.getSubstitutes(id);
        return ResponseEntity.ok(ApiResponse.ok(productMapper.toDtoList(substitutes)));
    }

    @GetMapping("/categories")
    public ResponseEntity<ApiResponse<List<Category>>> getCategories() {
        List<Category> categories = catalogService.getCategories();
        return ResponseEntity.ok(ApiResponse.ok(categories));
    }
}
