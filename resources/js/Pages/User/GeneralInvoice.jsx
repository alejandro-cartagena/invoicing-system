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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faEnvelope, faSave, faUpload } from '@fortawesome/free-solid-svg-icons';


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

    // Add this email validation function near the top of the component
    const isValidEmail = (email) => {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    const handleSendInvoice = async () => {
        try {
            // Email validation
            if (!recipientEmail.trim()) {
                toast.error('Please enter a recipient email address');
                return;
            }

            if (!isValidEmail(recipientEmail)) {
                toast.error('Please enter a valid email address');
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
            
            // Determine which endpoint to use based on whether we're editing or creating
            let response;
            
            if (isEditing && invoiceId) {
                // Use replace endpoint when editing
                console.log('Updating invoice in NMI merchant portal');
                response = await axios.post(route('invoice.replace', invoiceId), {
                    invoiceData: invoiceData,
                    recipientEmail: recipientEmail,
                    pdfBase64: base64data,
                    invoiceType: 'general'
                });
            } else {
                // Use send-to-nmi endpoint for new invoices
                console.log('Sending new invoice to NMI merchant portal');
                response = await axios.post(route('invoice.send-invoice'), {
                    invoiceData: invoiceData,
                    recipientEmail: recipientEmail,
                    pdfBase64: base64data,
                    invoiceType: 'general'
                });
            }
            
            console.log('Response from NMI:', response.data);
            
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


    return (
        <UserAuthenticatedLayout
            header={
                <h2 className="text-center text-xl font-semibold leading-tight text-gray-800">
                    {isEditing ? 'Edit Invoice' : 'Create General Invoice'}
                </h2>
            }
        >
            <div className="container md:max-w-4xl mx-auto md:py-10">
                
                {/* Email input section */}
                <div className="hidden md:block mb-6 p-6 bg-white rounded shadow-md">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Recipient's email"
                            pattern="[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                            title="Please enter a valid email address"
                            className="w-full flex-1 border-gray-300 rounded-md shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                            disabled={sending}
                            required
                        />
                        <button
                            onClick={handleSendInvoice}
                            disabled={sending}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm md:text-base hover:bg-blue-600 transition-all duration-300 flex items-center"
                        >
                            {sending ? (
                                <>
                                    <LoaderIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                                    {isEditing ? 'Update & Send' : 'Send Invoice'}
                                </>
                            )}
                        </button>
                    </div>
                    <p className="text-center md:text-left text-xs text-gray-500 mt-2">
                        This will create an invoice in your NMI merchant portal and send an email with PDF to the recipient.
                    </p>
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
                            pattern="[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                            title="Please enter a valid email address"
                            className="w-full flex-1 border-gray-300 rounded-md shadow-sm focus:border-gray-600 focus:ring focus:ring-gray-200 focus:ring-opacity-50"
                            disabled={sending}
                            required
                        />
                        <button
                            onClick={handleSendInvoice}
                            disabled={sending}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm md:text-base hover:bg-blue-600 transition-all duration-300 flex items-center"
                        >
                            {sending ? (
                                <>
                                    <LoaderIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
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
