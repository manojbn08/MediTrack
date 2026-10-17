package com.meditrack.catalog;

import com.meditrack.common.BusinessException;
import com.meditrack.inventory.ProductBatchRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CatalogService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductBatchRepository batchRepository;

    public CatalogService(ProductRepository productRepository,
                          CategoryRepository categoryRepository,
                          ProductBatchRepository batchRepository) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.batchRepository = batchRepository;
    }

    @Transactional(readOnly = true)
    public List<Product> getProducts(String query, Long categoryId, Boolean rx) {
        List<Product> products = productRepository.searchProducts(
                (query != null && !query.trim().isEmpty()) ? query.trim() : null,
                categoryId,
                rx
        );
        for (Product p : products) {
            Integer stock = batchRepository.getTotalAvailableStock(p.getId());
            p.setStockAvailable(stock != null ? stock : 0);
        }
        return products;
    }

    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Product not found with id: " + id, HttpStatus.NOT_FOUND));
        Integer stock = batchRepository.getTotalAvailableStock(product.getId());
        product.setStockAvailable(stock != null ? stock : 0);
        return product;
    }

    @Transactional(readOnly = true)
    public List<Category> getCategories() {
        return categoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Product> getSubstitutes(Long productId) {
        Product baseProduct = getProductById(productId);
        if (baseProduct.getGenericName() == null || baseProduct.getGenericName().isBlank()) {
            return java.util.Collections.emptyList();
        }

        return productRepository.findAll().stream()
                .filter(Product::isActive)
                .filter(p -> !p.getId().equals(baseProduct.getId()))
                .filter(p -> p.getGenericName() != null && p.getGenericName().equalsIgnoreCase(baseProduct.getGenericName()))
                .filter(p -> p.getForm() == baseProduct.getForm())
                .peek(p -> {
                    Integer stock = batchRepository.getTotalAvailableStock(p.getId());
                    p.setStockAvailable(stock != null ? stock : 0);
                })
                .sorted(java.util.Comparator.comparingDouble(Product::getMrp))
                .toList();
    }
}
