package com.meditrack.config;

import com.meditrack.catalog.*;
import com.meditrack.delivery.Delivery;
import com.meditrack.delivery.DeliveryRepository;
import com.meditrack.delivery.DeliveryStatus;
import com.meditrack.inventory.*;
import com.meditrack.order.*;
import com.meditrack.prescription.Prescription;
import com.meditrack.prescription.PrescriptionRepository;
import com.meditrack.prescription.PrescriptionStatus;
import com.meditrack.user.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ProductBatchRepository batchRepository;
    private final PharmacyRepository pharmacyRepository;
    private final AddressRepository addressRepository;
    private final PrescriptionRepository prescriptionRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final DeliveryRepository deliveryRepository;
    private final DeliveryPartnerProfileRepository deliveryPartnerProfileRepository;
    private final PharmacistProfileRepository pharmacistProfileRepository;

    public DataInitializer(RoleRepository roleRepository,
                           UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           CategoryRepository categoryRepository,
                           ProductRepository productRepository,
                           ProductBatchRepository batchRepository,
                           PharmacyRepository pharmacyRepository,
                           AddressRepository addressRepository,
                           PrescriptionRepository prescriptionRepository,
                           OrderRepository orderRepository,
                           OrderItemRepository orderItemRepository,
                           DeliveryRepository deliveryRepository,
                           DeliveryPartnerProfileRepository deliveryPartnerProfileRepository,
                           PharmacistProfileRepository pharmacistProfileRepository) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
        this.batchRepository = batchRepository;
        this.pharmacyRepository = pharmacyRepository;
        this.addressRepository = addressRepository;
        this.prescriptionRepository = prescriptionRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.deliveryRepository = deliveryRepository;
        this.deliveryPartnerProfileRepository = deliveryPartnerProfileRepository;
        this.pharmacistProfileRepository = pharmacistProfileRepository;
    }

    @Override
    public void run(String... args) {
        if (roleRepository.count() > 0) {
            return; // Already seeded
        }

        System.out.println(">>> Initializing MediTrack database with demo data...");

        // 1. Roles
        Role customerRole = roleRepository.save(new Role(RoleType.ROLE_CUSTOMER));
        Role pharmacistRole = roleRepository.save(new Role(RoleType.ROLE_PHARMACIST));
        Role deliveryRole = roleRepository.save(new Role(RoleType.ROLE_DELIVERY));
        Role adminRole = roleRepository.save(new Role(RoleType.ROLE_ADMIN));

        // 2. Pharmacy
        Pharmacy pharmacy = new Pharmacy();
        pharmacy.setName("MediTrack Central Dispensing Pharmacy");
        pharmacy.setDrugLicenseNo("KA-BLR-2026-DL-88219");
        pharmacy.setGstin("29AAACM1234F1Z8");
        pharmacy.setPhone("+91 80 2555 0199");
        pharmacy.setEmail("central@meditrack.com");
        pharmacy.setAddress("42/1, Brigade Road, Ashok Nagar, Bengaluru");
        pharmacy.setCity("Bengaluru");
        pharmacy.setState("Karnataka");
        pharmacy.setPincode("560001");
        pharmacy.setLatitude(12.9716);
        pharmacy.setLongitude(77.5946);
        pharmacy.setServiceRadiusKm(15.0);
        pharmacy = pharmacyRepository.save(pharmacy);

        // 3. Demo Users for all 4 roles
        String defaultPasswordHash = passwordEncoder.encode("Password@123");

        // Customer
        User customer = new User("Rahul Sharma", "customer@meditrack.com", "+919876543210", defaultPasswordHash);
        customer.getRoles().add(customerRole);
        customer = userRepository.save(customer);

        Address addr = new Address();
        addr.setUserId(customer.getId());
        addr.setLabel("Home");
        addr.setLine1("Flat 402, Green Glen Layout");
        addr.setLine2("Outer Ring Road, Bellandur");
        addr.setCity("Bengaluru");
        addr.setState("Karnataka");
        addr.setPincode("560103");
        addr.setLatitude(12.9304);
        addr.setLongitude(77.6784);
        addr.setDefault(true);
        addressRepository.save(addr);

        // Pharmacist
        User pharmacist = new User("Dr. Priya Venkatesh (Reg. Pharmacist)", "pharmacist@meditrack.com", "+919876543211", defaultPasswordHash);
        pharmacist.getRoles().add(pharmacistRole);
        pharmacist = userRepository.save(pharmacist);
        pharmacistProfileRepository.save(new PharmacistProfile(pharmacist.getId(), "KA-PCI-2024-55410", LocalDate.now().plusYears(4), pharmacy.getId()));

        // Delivery Partner
        User delivery = new User("Suresh Kumar (Rider)", "delivery@meditrack.com", "+919876543212", defaultPasswordHash);
        delivery.getRoles().add(deliveryRole);
        delivery = userRepository.save(delivery);
        deliveryPartnerProfileRepository.save(new DeliveryPartnerProfile(delivery.getId(), "BIKE", "KA-01-MJ-4021", "DL-042022001923"));

        // Admin
        User admin = new User("MediTrack Administrator", "admin@meditrack.com", "+919876543213", defaultPasswordHash);
        admin.getRoles().add(adminRole);
        userRepository.save(admin);

        // 4. Categories
        Category catPain = categoryRepository.save(new Category("Pain & Analgesics", "Fever, headache, body pain remedies"));
        Category catAntibiotics = categoryRepository.save(new Category("Antibiotics & Anti-infectives", "Prescription antibacterial treatments"));
        Category catDiabetes = categoryRepository.save(new Category("Diabetes & Metabolic", "Blood sugar management and insulin support"));
        Category catCardiac = categoryRepository.save(new Category("Cardiac & Hypertension", "Blood pressure and heart health"));
        Category catVitamins = categoryRepository.save(new Category("Vitamins & Supplements", "Immunity, daily nutrition, and minerals"));
        Category catResp = categoryRepository.save(new Category("Respiratory & Cough", "Cough syrups, inhalers, and antihistamines"));

        // 5. Products & Batches
        Product dolo = createProduct("MED-001", "Dolo 650 Tablet", "Paracetamol", catPain, ProductForm.TABLET, "650mg", "15 Tablets / Strip", DrugSchedule.OTC, false, 33.60, 12.0, "Effective for fever, cold symptoms and body aches.", "None reported under recommended dosage.");
        Product novamox = createProduct("MED-002", "Novamox 500 Capsule", "Amoxicillin", catAntibiotics, ProductForm.CAPSULE, "500mg", "10 Capsules / Strip", DrugSchedule.H, true, 114.50, 12.0, "Broad-spectrum penicillin antibiotic for bacterial infections.", "Nausea, rash, mild diarrhoea.");
        Product glycomet = createProduct("MED-003", "Glycomet 500 Tablet", "Metformin Hydrochloride", catDiabetes, ProductForm.TABLET, "500mg", "20 Tablets / Strip", DrugSchedule.H, true, 48.00, 12.0, "First-line medication for type 2 diabetes.", "GI disturbance, metallic taste.");
        Product telma = createProduct("MED-004", "Telma 40 Tablet", "Telmisartan", catCardiac, ProductForm.TABLET, "40mg", "15 Tablets / Strip", DrugSchedule.H, true, 128.50, 12.0, "Angiotensin receptor blocker for high blood pressure.", "Dizziness, back pain.");
        Product cetzine = createProduct("MED-005", "Cetzine 10mg Tablet", "Cetirizine Hydrochloride", catResp, ProductForm.TABLET, "10mg", "10 Tablets / Strip", DrugSchedule.OTC, false, 24.00, 12.0, "Fast non-sedating relief for runny nose, allergies and hives.", "Mild drowsiness in rare cases.");
        Product limcee = createProduct("MED-006", "Limcee 500 Chewable", "Ascorbic Acid (Vitamin C)", catVitamins, ProductForm.TABLET, "500mg", "15 Chewable Tabs", DrugSchedule.OTC, false, 32.50, 18.0, "Immunity booster with pleasant orange flavour.", "None.");
        Product azee = createProduct("MED-007", "Azee 500 Tablet", "Azithromycin", catAntibiotics, ProductForm.TABLET, "500mg", "5 Tablets / Strip", DrugSchedule.H, true, 132.00, 12.0, "Macrolide antibiotic for upper and lower respiratory infections.", "Abdominal pain, loose stools.");
        Product ascoril = createProduct("MED-008", "Ascoril D Plus Syrup", "Dextromethorphan + Chlorpheniramine", catResp, ProductForm.SYRUP, "100ml", "100ml Bottle", DrugSchedule.OTC, false, 118.00, 12.0, "Sugar-free relief from dry hacking cough and throat irritation.", "Mild sedation.");

        // Batches (FEFO: some standard, some near expiry)
        createBatch(dolo, "BT-DL-2601", LocalDate.now().plusMonths(18), 18.0, 33.60, 200);
        createBatch(dolo, "BT-DL-2511", LocalDate.now().plusDays(45), 16.0, 33.60, 50); // Near expiry (45 days)
        createBatch(novamox, "BT-NX-2603", LocalDate.now().plusMonths(14), 72.0, 114.50, 120);
        createBatch(glycomet, "BT-GM-2605", LocalDate.now().plusMonths(24), 28.0, 48.0, 150);
        createBatch(telma, "BT-TM-2608", LocalDate.now().plusMonths(20), 80.0, 128.50, 100);
        createBatch(cetzine, "BT-CZ-2602", LocalDate.now().plusMonths(16), 12.0, 24.0, 300);
        createBatch(limcee, "BT-LC-2604", LocalDate.now().plusMonths(12), 16.0, 32.50, 250);
        createBatch(azee, "BT-AZ-2512", LocalDate.now().plusDays(38), 85.0, 132.00, 40); // Near expiry (38 days)
        createBatch(ascoril, "BT-AS-2606", LocalDate.now().plusMonths(15), 65.0, 118.00, 80);

        // 6. Pre-seeded Prescription in PENDING state
        Prescription sampleRx = new Prescription();
        sampleRx.setUserId(customer.getId());
        sampleRx.setFileUrl("https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80");
        sampleRx.setPatientName("Rahul Sharma");
        sampleRx.setDoctorName("Dr. Ashok Sengupta, MD (Gen Med)");
        sampleRx.setDoctorRegNo("MCI-KA-1998-04218");
        sampleRx.setIssuedOn(LocalDate.now().minusDays(3));
        sampleRx.setValidTill(LocalDate.now().plusMonths(6));
        sampleRx.setStatus(PrescriptionStatus.PENDING);
        sampleRx = prescriptionRepository.save(sampleRx);

        // 7. Seed sample orders
        // Order 1: Ready for pickup (for delivery partner testing)
        Order orderReady = new Order();
        orderReady.setOrderNumber("MT-20261017-0101");
        orderReady.setCustomerId(customer.getId());
        orderReady.setCustomerName(customer.getFullName());
        orderReady.setCustomerPhone(customer.getPhone());
        orderReady.setAddressId(addr.getId());
        orderReady.setDeliveryAddressSnapshot("Flat 402, Green Glen Layout, Outer Ring Road, Bellandur, Bengaluru");
        orderReady.setDeliveryLat(12.9304);
        orderReady.setDeliveryLng(77.6784);
        orderReady.setHasRxItems(false);
        orderReady.setStatus(OrderStatus.READY_FOR_PICKUP);
        orderReady.setSubtotal(152.0);
        orderReady.setTaxAmount(18.2);
        orderReady.setDeliveryFee(40.0);
        orderReady.setDiscountAmount(0.0);
        orderReady.setTotalAmount(192.0);
        orderReady.setPaymentMethod(PaymentMethod.COD);
        orderReady.setPickupCode("PK-8812");
        orderReady.setDeliveryOtp("4921");
        orderReady = orderRepository.save(orderReady);

        OrderItem oi1 = new OrderItem();
        oi1.setOrder(orderReady);
        oi1.setProduct(dolo);
        oi1.setQuantity(2);
        oi1.setUnitPrice(dolo.getMrp());
        oi1.setGstPercent(dolo.getGstPercent());
        oi1.setLineTotal(dolo.getMrp() * 2);
        orderItemRepository.save(oi1);

        OrderItem oi2 = new OrderItem();
        oi2.setOrder(orderReady);
        oi2.setProduct(ascoril);
        oi2.setQuantity(1);
        oi2.setUnitPrice(ascoril.getMrp());
        oi2.setGstPercent(ascoril.getGstPercent());
        oi2.setLineTotal(ascoril.getMrp());
        orderItemRepository.save(oi2);

        Delivery readyDelivery = new Delivery();
        readyDelivery.setOrderId(orderReady.getId());
        readyDelivery.setStatus(DeliveryStatus.SEARCHING);
        readyDelivery.setPickupLat(12.9716);
        readyDelivery.setPickupLng(77.5946);
        readyDelivery.setDeliveryLat(12.9304);
        readyDelivery.setDeliveryLng(77.6784);
        readyDelivery.setDistanceKm(5.8);
        readyDelivery.setEtaMinutes(22);
        readyDelivery.setPickupCode("PK-8812");
        readyDelivery.setDeliveryOtp("4921");
        readyDelivery.setCodAmount(192.0);
        deliveryRepository.save(readyDelivery);

        // Order 2: Prescription pending order (for pharmacist verification queue)
        Order orderRx = new Order();
        orderRx.setOrderNumber("MT-20261017-0102");
        orderRx.setCustomerId(customer.getId());
        orderRx.setCustomerName(customer.getFullName());
        orderRx.setCustomerPhone(customer.getPhone());
        orderRx.setAddressId(addr.getId());
        orderRx.setDeliveryAddressSnapshot("Flat 402, Green Glen Layout, Outer Ring Road, Bellandur, Bengaluru");
        orderRx.setDeliveryLat(12.9304);
        orderRx.setDeliveryLng(77.6784);
        orderRx.setPrescriptionId(sampleRx.getId());
        orderRx.setHasRxItems(true);
        orderRx.setStatus(OrderStatus.PRESCRIPTION_PENDING);
        orderRx.setSubtotal(246.50);
        orderRx.setTaxAmount(26.4);
        orderRx.setDeliveryFee(40.0);
        orderRx.setDiscountAmount(0.0);
        orderRx.setTotalAmount(286.50);
        orderRx.setPaymentMethod(PaymentMethod.ONLINE);
        orderRx.setPickupCode("PK-9214");
        orderRx.setDeliveryOtp("7719");
        orderRx = orderRepository.save(orderRx);

        OrderItem oiRx = new OrderItem();
        oiRx.setOrder(orderRx);
        oiRx.setProduct(novamox);
        oiRx.setQuantity(1);
        oiRx.setUnitPrice(novamox.getMrp());
        oiRx.setGstPercent(novamox.getGstPercent());
        oiRx.setLineTotal(novamox.getMrp());
        orderItemRepository.save(oiRx);

        OrderItem oiRx2 = new OrderItem();
        oiRx2.setOrder(orderRx);
        oiRx2.setProduct(azee);
        oiRx2.setQuantity(1);
        oiRx2.setUnitPrice(azee.getMrp());
        oiRx2.setGstPercent(azee.getGstPercent());
        oiRx2.setLineTotal(azee.getMrp());
        orderItemRepository.save(oiRx2);

        System.out.println(">>> MediTrack database seeded successfully!");
        System.out.println(">>> Customer:   customer@meditrack.com / Password@123");
        System.out.println(">>> Pharmacist: pharmacist@meditrack.com / Password@123");
        System.out.println(">>> Delivery:   delivery@meditrack.com / Password@123");
        System.out.println(">>> Admin:      admin@meditrack.com / Password@123");
    }

    private Product createProduct(String sku, String name, String genericName, Category category,
                                  ProductForm form, String strength, String packSize,
                                  DrugSchedule schedule, boolean rx, Double mrp, Double gst,
                                  String desc, String sideEffects) {
        Product p = new Product();
        p.setSku(sku);
        p.setName(name);
        p.setGenericName(genericName);
        p.setCategory(category);
        p.setForm(form);
        p.setStrength(strength);
        p.setPackSize(packSize);
        p.setSchedule(schedule);
        p.setRequiresPrescription(rx);
        p.setMrp(mrp);
        p.setGstPercent(gst);
        p.setDescription(desc);
        p.setSideEffects(sideEffects);
        p.setActive(true);
        p.setReorderLevel(15);
        return productRepository.save(p);
    }

    private void createBatch(Product product, String batchNumber, LocalDate expiry,
                             Double purchasePrice, Double sellingPrice, int qty) {
        ProductBatch b = new ProductBatch();
        b.setProduct(product);
        b.setBatchNumber(batchNumber);
        b.setExpiryDate(expiry);
        b.setPurchasePrice(purchasePrice);
        b.setSellingPrice(sellingPrice);
        b.setQuantityReceived(qty);
        b.setQuantityAvailable(qty);
        b.setQuantityReserved(0);
        b.setStatus(BatchStatus.ACTIVE);
        batchRepository.save(b);
    }
}
