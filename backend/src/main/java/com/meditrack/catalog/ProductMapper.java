package com.meditrack.catalog;

import com.meditrack.catalog.dto.ProductResponseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ProductMapper {

    @Mapping(source = "category.id", target = "categoryId")
    @Mapping(source = "category.name", target = "categoryName")
    ProductResponseDto toDto(Product product);

    List<ProductResponseDto> toDtoList(List<Product> products);
}
