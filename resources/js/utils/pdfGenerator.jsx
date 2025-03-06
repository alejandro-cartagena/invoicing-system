import React from 'react';
import { format } from 'date-fns';

export const generatePDF = async (data) => {
    try {
        console.log('Generating PDF with data:', JSON.stringify(data));
        
        // Make sure we're passing a complete copy of the data with pre-calculated values
        const completeData = JSON.parse(JSON.stringify(data));
        
        // Pre-calculate totals to ensure they're correct in the PDF
        let subTotal = 0;
        if (completeData.productLines) {
            completeData.productLines.forEach(line => {
                const qty = parseFloat(line.quantity || 0);
                const rate = parseFloat(line.rate || 0);
                if (!isNaN(qty) && !isNaN(rate)) {
                    subTotal += qty * rate;
                }
            });
        }
        
        // Add calculated values to the data
        completeData._calculatedSubTotal = subTotal;
        
        const taxMatch = completeData.taxLabel ? completeData.taxLabel.match(/(\d+)%/) : null;
        const taxRate = taxMatch ? parseFloat(taxMatch[1]) : 0;
        const saleTax = subTotal * (taxRate / 100);
        
        completeData._calculatedTax = saleTax;
        completeData._calculatedTotal = subTotal + saleTax;
        
        // Ensure dates are properly formatted
        if (!completeData.invoiceDate) {
            const today = new Date();
            completeData.invoiceDate = format(today, 'MMM dd, yyyy');
        }

        if (!completeData.invoiceDueDate) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            completeData.invoiceDueDate = format(dueDate, 'MMM dd, yyyy');
        }
        
        // Dynamically import to reduce initial bundle size
        const { pdf } = await import('@react-pdf/renderer');
        const InvoicePage = (await import('@/Components/GeneralInvoiceComponents/InvoicePage')).default;
        
        const blob = await pdf(<InvoicePage data={completeData} pdfMode={true} />).toBlob();
        return blob;
    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error('Failed to generate PDF: ' + error.message);
    }
};

export const convertBlobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const calculateBase64Size = (base64String) => {
    if (!base64String) return 0;
    
    // Remove the data URL prefix if present
    const base64Data = base64String.includes('base64,') 
        ? base64String.split('base64,')[1] 
        : base64String;
    
    // Calculate size: base64 string length * 3/4 gives approximate decoded size
    return Math.ceil((base64Data.length * 3) / 4);
}; 