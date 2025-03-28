import React, { useState, useEffect } from 'react';
import InvoicePage from '@/Components/GeneralInvoiceComponents/InvoicePage';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { router, usePage, Head } from '@inertiajs/react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';
import { generatePDF, convertBlobToBase64, calculateBase64Size } from '@/utils/pdfGenerator.jsx';
import FileSaver from 'file-saver';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { saveTemplate, handleTemplateUpload } from '@/utils/templateHandler';
import { LoaderIcon, MailIcon, DownloadIcon } from '@/Components/Icons';

const MAX_IMAGE_SIZE_MB = 1; // Maximum image size in MB
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024; // Convert to bytes

const GeneralInvoice = () => {
    // Get props from the page
    const { invoiceData: initialInvoiceData, recipientEmail: initialEmail, invoiceId, isEditing: initialIsEditing, isResending: initialIsResending } = usePage().props;
    
    const [invoiceData, setInvoiceData] = useState(initialInvoiceData || null);
    const [recipientEmail, setRecipientEmail] = useState(initialEmail || '');
    const [sending, setSending] = useState(false);
    const [isEditing, setIsEditing] = useState(initialIsEditing || false);
    const [isResending, setIsResending] = useState(initialIsResending || false);
    const [isLoading, setIsLoading] = useState(false);

    const handleInvoiceUpdate = (invoice) => {
        setInvoiceData(invoice);
    };


    const handleSendInvoice = async () => {
        try {
            // Basic validation
            if (!recipientEmail.trim()) {
                toast.error('Please enter a recipient email address');
                return;
            }

            if (!invoiceData || !invoiceData.productLines || invoiceData.productLines.length === 0) {
                toast.error('Please add at least one product line');
                return;
            }

            // Check for large images in the invoice data
            if (invoiceData.logo) {
                const logoSize = calculateBase64Size(invoiceData.logo);
                if (logoSize > MAX_IMAGE_SIZE_BYTES) {
                    toast.error(`Logo image is too large (${(logoSize / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${MAX_IMAGE_SIZE_MB}MB. Please reduce the image size and try again.`);
                    return;
                }
            }

            setSending(true);
            
            // Generate PDF
            console.log('Generating PDF for invoice');
            const pdfBlob = await generatePDF(invoiceData);
            
            // Check PDF size
            if (pdfBlob.size > 8 * 1024 * 1024) { // 8MB limit for the PDF
                throw new Error(`Generated PDF is too large (${(pdfBlob.size / (1024 * 1024)).toFixed(2)}MB). Try removing large images or reducing image quality.`);
            }
            
            // Convert to base64
            const base64data = await convertBlobToBase64(pdfBlob);
            
            console.log('Generated PDF for invoice');

            console.log("invoiceData", invoiceData);
            
            // Send to NMI merchant portal and email
            console.log('Sending invoice to merchant portal (NMI) and email');
            const response = await axios.post(route('invoice.send-to-nmi'), {
                invoiceData: invoiceData,
                recipientEmail: recipientEmail,
                pdfBase64: base64data,
                invoiceType: 'general'
            });
            
            console.log('Response from send-to-nmi:', response.data);
            
            if (response.data.success) {
                let successMessage = isEditing 
                    ? 'Invoice updated and sent successfully!' 
                    : 'Invoice sent successfully!';
                
                toast.success(successMessage);
                
                // Use setTimeout to redirect after showing the toast
                setTimeout(() => {
                    router.get(route('user.invoices'));
                }, 2000); // Wait 2 seconds before redirecting
            } else {
                toast.error(response.data.message || 'Failed to send invoice');
            }
        } catch (error) {
            console.error('Error sending invoice:', error);
            
            let errorMessage = 'Failed to process invoice';
            
            // Check for specific error types
            if (error.message && error.message.includes('too large')) {
                errorMessage = error.message;
            } else if (error.response?.data?.message) {
                // Check for database size errors
                if (error.response.data.message.includes('SQLSTATE[08S01]') || 
                    error.response.data.message.includes('max_allowed_packet')) {
                    errorMessage = 'The invoice contains images that are too large. Please reduce image sizes and try again.';
                } else {
                    errorMessage = error.response.data.message;
                }
                
                if (error.response.data.debug_info) {
                    console.error('Debug info:', error.response.data.debug_info);
                }

                if (error.response.data.nmi_response) {
                    console.error('NMI response:', error.response.data.nmi_response);
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            toast.error(errorMessage);
        } finally {
            setSending(false);
        }
    };

    const handleSaveTemplate = () => {
        saveTemplate(invoiceData);
    };

    const handleFileUpload = (e) => {
        if (!e.target.files?.length) return;
        handleTemplateUpload(e.target.files[0], setInvoiceData);
    };

    const handleDownloadPdf = async () => {
        if (!invoiceData) {
            toast.error('Please create an invoice first');
            return;
        }

        // Check for large images in the invoice data
        if (invoiceData.logo) {
            const logoSize = calculateBase64Size(invoiceData.logo);
            if (logoSize > MAX_IMAGE_SIZE_BYTES) {
                toast.error(`Logo image is too large (${(logoSize / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${MAX_IMAGE_SIZE_MB}MB. Please reduce the image size and try again.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            // Show loading indicator
            toast.loading('Generating PDF...');
            
            // Use the same PDF generation logic as the email function
            const pdfBlob = await generatePDF(invoiceData);
            
            // Create and click download link
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'invoice.pdf');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            console.log("PDF Blob:", pdfBlob);
            
            toast.dismiss();
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <UserAuthenticatedLayout
            header={
                <h2 className="text-center text-xl font-semibold leading-tight text-gray-800">
                    {isEditing ? 'Edit Invoice' : 'Create General Invoice'}
                </h2>
            }
        >
            <div className="max-w-2xl mx-auto md:py-10">
                
                {/* Email input section */}
                <div className="hidden md:block mb-6 p-6 bg-white rounded shadow-md">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Recipient's email"
                            className="w-full flex-1 border-gray-300 rounded-md shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                            disabled={sending}
                        />
                        <button
                            onClick={handleSendInvoice}
                            disabled={sending}
                            className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md text-base hover:bg-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {sending ? (
                                <>
                                    <LoaderIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    {isEditing ? 'Update & Send' : 'Send Invoice'}
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-center md:text-left text-xs text-gray-500 mt-2">
                        This will create an invoice in your NMI merchant portal and send an email with PDF to the recipient.
                    </p>
                </div>

                {/* Mobile-only buttons */}
                <div className="md:hidden my-4 flex justify-center gap-4">
                    
                    
                    
                </div>

                {/* Templates buttons - visible on both mobile and desktop */}
                <div className="md:hidden flex justify-center flex-wrap gap-4 mb-4">
                    <button 
                        onClick={handleDownloadPdf}
                        className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 active:bg-gray-700"
                        disabled={sending}
                    >
                        Download PDF
                    </button>
                    <button
                        onClick={handleSaveTemplate}
                        className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 active:bg-gray-700"
                    >
                        Save Template
                    </button>

                    <label className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm cursor-pointer hover:bg-gray-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 active:bg-gray-700 flex items-center justify-center">
                        Upload Template
                        <input
                            type="file"
                            accept=".json,.template"
                            onChange={handleFileUpload}
                            className="sr-only"
                        />
                    </label>
                </div>

                <InvoicePage 
                    data={invoiceData} 
                    onChange={handleInvoiceUpdate} 
                />

                {/* Email input section */}
                <div className="block md:hidden mb-6 p-6 my-5 bg-white rounded shadow-md">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Recipient's email"
                            className="w-full flex-1 border-gray-300 rounded-md shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                            disabled={sending}
                        />
                        <button
                            onClick={handleSendInvoice}
                            disabled={sending}
                            className="w-full md:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md text-base hover:bg-indigo-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50"
                        >
                            {sending ? (
                                <>
                                    <LoaderIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    {isEditing ? 'Update & Send' : 'Send Invoice'}
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-center md:text-left text-xs text-gray-500 mt-2">
                        This will create an invoice in your NMI merchant portal and send an email with PDF to the recipient.
                    </p>
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
}

export default GeneralInvoice;
