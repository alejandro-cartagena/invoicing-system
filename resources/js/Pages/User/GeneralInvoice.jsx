import React, { useState, useEffect } from 'react';
import InvoicePage from '@/Components/GeneralInvoiceComponents/InvoicePage';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { router } from '@inertiajs/react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';

const GeneralInvoice = () => {
    const [invoiceData, setInvoiceData] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        // Load saved invoice data from localStorage on component mount
        const savedInvoice = window.localStorage.getItem('invoiceData');
        if (savedInvoice) {
            try {
                const data = JSON.parse(savedInvoice);
                setInvoiceData(data);
            } catch (error) {
                console.error('Error parsing saved invoice:', error);
            }
        }
    }, []);

    const handleInvoiceUpdate = (invoice) => {
        // Save updated invoice data to localStorage
        window.localStorage.setItem('invoiceData', JSON.stringify(invoice));
        setInvoiceData(invoice);
    };

    const generatePDF = async (data) => {
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
            
            const { pdf } = await import('@react-pdf/renderer');
            const blob = await pdf(<InvoicePage data={completeData} pdfMode={true} />).toBlob();
            return blob;
        } catch (error) {
            console.error('PDF generation error:', error);
            throw new Error('Failed to generate PDF: ' + error.message);
        }
    };

    const convertBlobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleSendEmail = async () => {
        if (!recipientEmail) {
            toast.error('Please enter recipient email');
            return;
        }

        if (!invoiceData) {
            toast.error('Please create an invoice first');
            return;
        }

        setSending(true);
        try {
            // Generate PDF
            console.log('Generating PDF...');
            const pdfBlob = await generatePDF(invoiceData);
            console.log('PDF generated successfully');

            // Convert to base64
            console.log('Converting PDF to base64...');
            const base64data = await convertBlobToBase64(pdfBlob);
            console.log('PDF converted to base64, length:', base64data.length);

            // Send to backend
            console.log('Sending to backend...', {
                recipientEmail,
                invoiceDataLength: JSON.stringify(invoiceData).length,
                pdfBase64Length: base64data.length
            });

            const response = await axios.post('/general-invoice/send-email', {
                recipientEmail,
                invoiceData,
                pdfBase64: base64data,
            });

            console.log('Backend response:', response.data);

            if (response.data.success) {
                toast.success('Invoice sent successfully!');
                setRecipientEmail('');
            } else {
                throw new Error(response.data.message || 'Failed to send invoice');
            }
        } catch (error) {
            console.error('Full error object:', error);
            console.error('Error response data:', error.response?.data);
            
            let errorMessage = 'Failed to send invoice';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
                if (error.response.data.debug_info) {
                    console.error('Debug info:', error.response.data.debug_info);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
        } finally {
            setSending(false);
        }
    };

    return (
        <UserAuthenticatedLayout
            header={
                <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
                    Create Your General Invoice
                </h2>
            }
        >
            <div className="max-w-2xl mx-auto py-10">
                
                {/* Email input section */}
                <div className="mb-6 p-6 bg-white rounded shadow-md">
                    <div className="flex items-center gap-4">
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Recipient's email"
                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                            disabled={sending}
                        />
                        <button
                            onClick={handleSendEmail}
                            disabled={sending}
                            className="px-4 py-2 bg-gray-500 text-white rounded-md text-base hover:bg-red-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {sending ? 'Sending...' : 'Send Invoice'}
                        </button>
                    </div>
                </div>

                <InvoicePage 
                    data={invoiceData} 
                    onChange={handleInvoiceUpdate} 
                />

                
            </div>
        </UserAuthenticatedLayout>
    );
}

export default GeneralInvoice;
