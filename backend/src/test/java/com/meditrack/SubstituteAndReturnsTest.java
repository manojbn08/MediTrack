package com.meditrack;

import com.meditrack.catalog.*;
import com.meditrack.common.BusinessException;
import com.meditrack.inventory.ProductBatchRepository;
import com.meditrack.order.*;
import com.meditrack.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SubstituteAndReturnsTest {

    private ProductRepository productRepository;
    private CategoryRepository categoryRepository;
    private ProductBatchRepository batchRepository;
    private CatalogService catalogService;

    @BeforeEach
    void setUp() {
        productRepository = mock(ProductRepository.class);
        categoryRepository = mock(CategoryRepository.class);
        batchRepository = mock(ProductBatchRepository.class);

        catalogService = new CatalogService(productRepository, categoryRepository, batchRepository);
    }

    @Test
    @DisplayName("Finds bio-equivalent generic substitutes matching generic salt and formulation, sorted by lowest price")
    void testGetSubstitutes() {
        Product base = new Product();
        base.setId(1L);
        base.setName("Crocin 650");
        base.setGenericName("Paracetamol 650mg");
        base.setForm(ProductForm.TABLET);
        base.setMrp(32.0);
        base.setActive(true);

        Product alt1 = new Product();
        alt1.setId(2L);
        alt1.setName("Dolo 650");
        alt1.setGenericName("Paracetamol 650mg");
        alt1.setForm(ProductForm.TABLET);
        alt1.setMrp(30.0);
        alt1.setActive(true);

        Product alt2 = new Product();
        alt2.setId(3L);
        alt2.setName("Generic Paracetamol 650mg");
        alt2.setGenericName("Paracetamol 650mg");
        alt2.setForm(ProductForm.TABLET);
        alt2.setMrp(18.0);
        alt2.setActive(true);

        Product differentForm = new Product();
        differentForm.setId(4L);
        differentForm.setName("Paracetamol Syrup");
        differentForm.setGenericName("Paracetamol 650mg");
        differentForm.setForm(ProductForm.SYRUP);
        differentForm.setMrp(45.0);
        differentForm.setActive(true);

        when(productRepository.findById(1L)).thenReturn(Optional.of(base));
        when(productRepository.findAll()).thenReturn(List.of(base, alt1, alt2, differentForm));
        when(batchRepository.getTotalAvailableStock(any())).thenReturn(50);

        List<Product> substitutes = catalogService.getSubstitutes(1L);

        assertEquals(2, substitutes.size());
        // Lowest price first
        assertEquals("Generic Paracetamol 650mg", substitutes.get(0).getName());
        assertEquals(18.0, substitutes.get(0).getMrp());
        assertEquals("Dolo 650", substitutes.get(1).getName());
        assertEquals(30.0, substitutes.get(1).getMrp());
    }

    @Test
    @DisplayName("Returns empty substitute list when base product has no generic salt specified")
    void testEmptySubstitutesWhenNoGenericName() {
        Product base = new Product();
        base.setId(5L);
        base.setName("Herbal Wellness Drink");
        base.setGenericName(null);

        when(productRepository.findById(5L)).thenReturn(Optional.of(base));

        List<Product> substitutes = catalogService.getSubstitutes(5L);
        assertTrue(substitutes.isEmpty());
    }

    @Test
    @DisplayName("Returns request validation rejects non-delivered orders")
    void testReturnValidationRejectsNonDeliveredOrder() {
        OrderService orderService = mock(OrderService.class);
        OrderReturnRepository returnRepository = mock(OrderReturnRepository.class);
        com.meditrack.order.InvoicePdfService invoicePdfService = mock(com.meditrack.order.InvoicePdfService.class);
        com.meditrack.order.QrCodeService qrCodeService = mock(com.meditrack.order.QrCodeService.class);

        CustomerOrderController controller = new CustomerOrderController(orderService, invoicePdfService, qrCodeService, returnRepository);

        Order placedOrder = new Order();
        placedOrder.setId(10L);
        placedOrder.setCustomerId(100L);
        placedOrder.setStatus(OrderStatus.CONFIRMED); // Not delivered yet

        UserPrincipal principal = new UserPrincipal(
                100L, "cust@test.com", "pass", "Customer",
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")), true
        );

        when(orderService.getOrderById(10L)).thenReturn(placedOrder);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                controller.requestReturn(principal, 10L, Map.of("reason", "Defect"))
        );
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatus());
        assertTrue(ex.getMessage().contains("Only delivered orders"));
    }
}
