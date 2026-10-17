package com.meditrack.catalog.dto;

import com.meditrack.catalog.DrugSchedule;
import com.meditrack.catalog.ProductForm;

public class ProductResponseDto {
    private Long id;
    private String sku;
    private String name;
    private String genericName;
    private Long categoryId;
    private String categoryName;
    private ProductForm form;
    private String strength;
    private String packSize;
    private DrugSchedule schedule;
    private boolean requiresPrescription;
    private Double mrp;
    private Double gstPercent;
    private String description;
    private String sideEffects;
    private String imageUrl;
    private Integer stockAvailable;

    public ProductResponseDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGenericName() { return genericName; }
    public void setGenericName(String genericName) { this.genericName = genericName; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public ProductForm getForm() { return form; }
    public void setForm(ProductForm form) { this.form = form; }

    public String getStrength() { return strength; }
    public void setStrength(String strength) { this.strength = strength; }

    public String getPackSize() { return packSize; }
    public void setPackSize(String packSize) { this.packSize = packSize; }

    public DrugSchedule getSchedule() { return schedule; }
    public void setSchedule(DrugSchedule schedule) { this.schedule = schedule; }

    public boolean isRequiresPrescription() { return requiresPrescription; }
    public void setRequiresPrescription(boolean requiresPrescription) { this.requiresPrescription = requiresPrescription; }

    public Double getMrp() { return mrp; }
    public void setMrp(Double mrp) { this.mrp = mrp; }

    public Double getGstPercent() { return gstPercent; }
    public void setGstPercent(Double gstPercent) { this.gstPercent = gstPercent; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getSideEffects() { return sideEffects; }
    public void setSideEffects(String sideEffects) { this.sideEffects = sideEffects; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Integer getStockAvailable() { return stockAvailable; }
    public void setStockAvailable(Integer stockAvailable) { this.stockAvailable = stockAvailable; }
}
