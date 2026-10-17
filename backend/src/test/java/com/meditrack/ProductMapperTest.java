package com.meditrack;

import com.meditrack.catalog.*;
import com.meditrack.catalog.dto.ProductResponseDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ProductMapperTest {

    private final ProductMapper mapper = Mappers.getMapper(ProductMapper.class);

    @Test
    @DisplayName("Verify MapStruct generates type-safe DTO mapping with category nesting")
    void testProductMapping() {
        Category category = new Category();
        category.setId(10L);
        category.setName("Pain Relief");

        Product product = new Product();
        product.setId(1L);
        product.setSku("MED-PARA-650");
        product.setName("Dolo 650");
        product.setGenericName("Paracetamol");
        product.setCategory(category);
        product.setForm(ProductForm.TABLET);
        product.setStrength("650mg");
        product.setPackSize("15 Tablets / Strip");
        product.setSchedule(DrugSchedule.OTC);
        product.setRequiresPrescription(false);
        product.setMrp(32.50);
        product.setGstPercent(12.0);
        product.setStockAvailable(120);

        ProductResponseDto dto = mapper.toDto(product);

        assertNotNull(dto);
        assertEquals(1L, dto.getId());
        assertEquals("MED-PARA-650", dto.getSku());
        assertEquals("Dolo 650", dto.getName());
        assertEquals(10L, dto.getCategoryId());
        assertEquals("Pain Relief", dto.getCategoryName());
        assertEquals(ProductForm.TABLET, dto.getForm());
        assertEquals("650mg", dto.getStrength());
        assertEquals(32.50, dto.getMrp());
        assertEquals(120, dto.getStockAvailable());

        // Test list mapping
        List<ProductResponseDto> dtoList = mapper.toDtoList(List.of(product));
        assertNotNull(dtoList);
        assertEquals(1, dtoList.size());
        assertEquals("Dolo 650", dtoList.get(0).getName());
    }
}
