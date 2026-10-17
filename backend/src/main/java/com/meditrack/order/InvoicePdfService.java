package com.meditrack.order;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class InvoicePdfService {

    public byte[] generateInvoicePdf(Order order) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(15, 118, 110));
            Font subHeaderFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.DARK_GRAY);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);
            Font tableHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);

            // 1. Header Table (Brand & License Info)
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            PdfPCell companyCell = new PdfPCell();
            companyCell.setBorder(Rectangle.NO_BORDER);
            companyCell.addElement(new Paragraph("MediTrack Healthcare & Pharmacy Pvt Ltd", titleFont));
            companyCell.addElement(new Paragraph("Retail & Hospital Drug Distribution License No: DL-KA-20B-7891 / 21B-7892", subHeaderFont));
            companyCell.addElement(new Paragraph("GSTIN: 29AABCM1234F1Z5 | FSSAI: 11223344556677", subHeaderFont));
            companyCell.addElement(new Paragraph("12th Main, Indiranagar, Bengaluru, Karnataka - 560038 | Support: +91 80 4000 5000", subHeaderFont));
            headerTable.addCell(companyCell);

            PdfPCell invoiceMetaCell = new PdfPCell();
            invoiceMetaCell.setBorder(Rectangle.NO_BORDER);
            invoiceMetaCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            Paragraph invTitle = new Paragraph("TAX INVOICE", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(15, 118, 110)));
            invTitle.setAlignment(Element.ALIGN_RIGHT);
            invoiceMetaCell.addElement(invTitle);

            Paragraph invNo = new Paragraph("Invoice No: INV-" + order.getOrderNumber(), boldFont);
            invNo.setAlignment(Element.ALIGN_RIGHT);
            invoiceMetaCell.addElement(invNo);

            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("dd-MMM-yyyy HH:mm");
            Paragraph invDate = new Paragraph("Date: " + (order.getPlacedAt() != null ? order.getPlacedAt().format(dtf) : "N/A"), regularFont);
            invDate.setAlignment(Element.ALIGN_RIGHT);
            invoiceMetaCell.addElement(invDate);

            Paragraph invPay = new Paragraph("Payment: " + (order.getPaymentMethod() != null ? order.getPaymentMethod().name() : "PREPAID"), regularFont);
            invPay.setAlignment(Element.ALIGN_RIGHT);
            invoiceMetaCell.addElement(invPay);
            headerTable.addCell(invoiceMetaCell);

            document.add(headerTable);
            document.add(new Paragraph(" "));

            // 2. Customer & Delivery Information
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50, 50});

            PdfPCell billToCell = new PdfPCell();
            billToCell.setBackgroundColor(new Color(248, 250, 252));
            billToCell.setPadding(8);
            billToCell.setBorderColor(new Color(226, 232, 240));
            billToCell.addElement(new Paragraph("Billed & Delivered To:", boldFont));
            billToCell.addElement(new Paragraph("Customer: " + (order.getCustomerName() != null ? order.getCustomerName() : "Valued Customer"), regularFont));
            billToCell.addElement(new Paragraph("Phone: " + (order.getCustomerPhone() != null ? order.getCustomerPhone() : "N/A"), regularFont));
            billToCell.addElement(new Paragraph("Address: " + (order.getDeliveryAddressSnapshot() != null ? order.getDeliveryAddressSnapshot() : "Counter Pickup"), regularFont));
            infoTable.addCell(billToCell);

            PdfPCell dispatchCell = new PdfPCell();
            dispatchCell.setBackgroundColor(new Color(248, 250, 252));
            dispatchCell.setPadding(8);
            dispatchCell.setBorderColor(new Color(226, 232, 240));
            dispatchCell.addElement(new Paragraph("Order Details & Security:", boldFont));
            dispatchCell.addElement(new Paragraph("Order Status: " + order.getStatus().name(), regularFont));
            dispatchCell.addElement(new Paragraph("Pickup / Handover Code: " + (order.getPickupCode() != null ? order.getPickupCode() : "N/A"), regularFont));
            dispatchCell.addElement(new Paragraph("Prescription Attached: " + (order.isHasRxItems() ? "YES (Verified)" : "NO (OTC)"), regularFont));
            infoTable.addCell(dispatchCell);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            // 3. Itemized Medicines Table with GST breakdown
            PdfPTable itemTable = new PdfPTable(8);
            itemTable.setWidthPercentage(100);
            itemTable.setWidths(new float[]{5, 30, 13, 12, 10, 10, 10, 10});

            String[] headers = {"#", "Item Description", "Batch", "Expiry", "Qty", "Rate (₹)", "GST %", "Total (₹)"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, tableHeaderFont));
                cell.setBackgroundColor(new Color(15, 118, 110));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(5);
                itemTable.addCell(cell);
            }

            int index = 1;
            double calculatedTaxable = 0.0;
            double calculatedGst = 0.0;

            if (order.getItems() != null && !order.getItems().isEmpty()) {
                for (OrderItem item : order.getItems()) {
                    itemTable.addCell(new PdfPCell(new Phrase(String.valueOf(index++), regularFont)));
                    
                    String prodName = item.getProduct() != null ? item.getProduct().getName() : "Medicine";
                    String generic = item.getProduct() != null && item.getProduct().getGenericName() != null ? " (" + item.getProduct().getGenericName() + ")" : "";
                    itemTable.addCell(new PdfPCell(new Phrase(prodName + generic, regularFont)));

                    itemTable.addCell(new PdfPCell(new Phrase(item.getBatchNumber() != null ? item.getBatchNumber() : "B-GEN", regularFont)));
                    itemTable.addCell(new PdfPCell(new Phrase("12/2027", regularFont)));

                    PdfPCell qtyCell = new PdfPCell(new Phrase(String.valueOf(item.getQuantity()), regularFont));
                    qtyCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(qtyCell);

                    PdfPCell priceCell = new PdfPCell(new Phrase(String.format("%.2f", item.getUnitPrice()), regularFont));
                    priceCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(priceCell);

                    double gstP = item.getGstPercent() != null ? item.getGstPercent() : 12.0;
                    PdfPCell gstCell = new PdfPCell(new Phrase(String.format("%.1f%%", gstP), regularFont));
                    gstCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(gstCell);

                    double lineTotal = item.getLineTotal() != null ? item.getLineTotal() : (item.getUnitPrice() * item.getQuantity());
                    PdfPCell totalCell = new PdfPCell(new Phrase(String.format("%.2f", lineTotal), regularFont));
                    totalCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    itemTable.addCell(totalCell);

                    calculatedTaxable += lineTotal;
                }
            } else {
                PdfPCell emptyCell = new PdfPCell(new Phrase("No item lines available", regularFont));
                emptyCell.setColspan(8);
                emptyCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                itemTable.addCell(emptyCell);
            }

            document.add(itemTable);
            document.add(new Paragraph(" "));

            // 4. Totals and Tax Breakdown Table
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{60, 40});

            PdfPCell termsCell = new PdfPCell();
            termsCell.setBorder(Rectangle.NO_BORDER);
            termsCell.addElement(new Paragraph("Tax Summary & Pharmacist Certification:", boldFont));
            termsCell.addElement(new Paragraph("1. Schedule H / H1 drugs dispensed strictly on verified registered medical practitioner prescription.", smallFont));
            termsCell.addElement(new Paragraph("2. Storage condition: Store below 25°C, protect from moisture and light.", smallFont));
            termsCell.addElement(new Paragraph("3. Medicines once sold cannot be returned without verified batch defect.", smallFont));
            termsCell.addElement(new Paragraph("Dispensed by Registered Pharmacist (Reg No: KA-PH-99214)", smallFont));
            summaryTable.addCell(termsCell);

            PdfPTable amountsTable = new PdfPTable(2);
            amountsTable.setWidthPercentage(100);
            amountsTable.setWidths(new float[]{55, 45});

            addSummaryRow(amountsTable, "Item Subtotal:", String.format("₹%.2f", order.getSubtotal() != null ? order.getSubtotal() : calculatedTaxable), regularFont);
            
            double cgst = (order.getTaxAmount() != null ? order.getTaxAmount() : 0.0) / 2.0;
            double sgst = cgst;
            addSummaryRow(amountsTable, "CGST:", String.format("₹%.2f", cgst), regularFont);
            addSummaryRow(amountsTable, "SGST / UTGST:", String.format("₹%.2f", sgst), regularFont);
            addSummaryRow(amountsTable, "Delivery Charges:", String.format("₹%.2f", order.getDeliveryFee() != null ? order.getDeliveryFee() : 0.0), regularFont);
            if (order.getDiscountAmount() != null && order.getDiscountAmount() > 0) {
                addSummaryRow(amountsTable, "Discount (" + (order.getCouponCode() != null ? order.getCouponCode() : "Promo") + "):", String.format("-₹%.2f", order.getDiscountAmount()), regularFont);
            }

            PdfPCell grandLabelCell = new PdfPCell(new Phrase("Grand Total:", boldFont));
            grandLabelCell.setPadding(6);
            grandLabelCell.setBackgroundColor(new Color(241, 245, 249));
            amountsTable.addCell(grandLabelCell);

            PdfPCell grandValCell = new PdfPCell(new Phrase(String.format("₹%.2f", order.getTotalAmount() != null ? order.getTotalAmount() : 0.0), boldFont));
            grandValCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            grandValCell.setPadding(6);
            grandValCell.setBackgroundColor(new Color(241, 245, 249));
            amountsTable.addCell(grandValCell);

            PdfPCell summaryCell = new PdfPCell(amountsTable);
            summaryCell.setBorder(Rectangle.NO_BORDER);
            summaryTable.addCell(summaryCell);

            document.add(summaryTable);
            document.close();

            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate PDF invoice: " + ex.getMessage(), ex);
        }
    }

    private void addSummaryRow(PdfPTable table, String label, String value, Font font) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, font));
        c1.setBorder(Rectangle.NO_BORDER);
        c1.setPadding(3);
        table.addCell(c1);

        PdfPCell c2 = new PdfPCell(new Phrase(value, font));
        c2.setBorder(Rectangle.NO_BORDER);
        c2.setHorizontalAlignment(Element.ALIGN_RIGHT);
        c2.setPadding(3);
        table.addCell(c2);
    }
}
