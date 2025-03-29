import React, { useState, useEffect } from 'react';
import RealEstateInvoicePage from '@/Components/GeneralInvoiceComponents/RealEstateInvoicePage';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { router, usePage } from '@inertiajs/react';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';
import { generatePDF, convertBlobToBase64, calculateBase64Size } from '@/utils/pdfGenerator.jsx';
import FileSaver from 'file-saver';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { saveTemplate, handleTemplateUpload } from '@/utils/templateHandler';
import { generateRealEstatePDF } from '@/utils/pdfGenerator.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faEnvelope, faSave, faUpload } from '@fortawesome/free-solid-svg-icons';

const MAX_IMAGE_SIZE_MB = 1; // Maximum image size in MB
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024; // Convert to bytes

const RealEstateInvoice = () => {
    // Get props from the page
    const { invoiceData: initialInvoiceData, recipientEmail: initialEmail, invoiceId, isEditing: initialIsEditing, isResending: initialIsResending } = usePage().props;
    
    const [invoiceData, setInvoiceData] = useState(initialInvoiceData || null);
    const [recipientEmail, setRecipientEmail] = useState(initialEmail || '');
    const [sending, setSending] = useState(false);
    const [isEditing, setIsEditing] = useState(initialIsEditing || false);
    const [isResending, setIsResending] = useState(initialIsResending || false);

    const handleInvoiceUpdate = (invoice) => {
        setInvoiceData(invoice);
    };

    const handleSendInvoice = async () => {
        if (!recipientEmail) {
            toast.error('Please enter recipient email');
            return;
        }

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

        setSending(true);
        try {
            // Generate PDF - Use generateRealEstatePDF instead of generatePDF
            const pdfBlob = await generateRealEstatePDF(invoiceData);

            // Check PDF size
            if (pdfBlob.size > 8 * 1024 * 1024) { // 8MB limit for the PDF
                throw new Error(`Generated PDF is too large (${(pdfBlob.size / (1024 * 1024)).toFixed(2)}MB). Try removing large images or reducing image quality.`);
            }

            // Convert to base64
            const base64data = await convertBlobToBase64(pdfBlob);

            console.log("invoiceData", invoiceData);

            // Determine which endpoint to use based on whether we're editing or creating
            let endpoint, responseData;
            
            if (isEditing && invoiceId) {
                // Use update-in-nmi endpoint when editing
                console.log('Updating real estate invoice in NMI merchant portal');
                const response = await axios.post(route('invoice.update-in-nmi', invoiceId), {
                    invoiceData: invoiceData,
                    recipientEmail: recipientEmail,
                    pdfBase64: base64data,
                    invoiceType: 'real_estate',
                    propertyAddress: invoiceData.propertyAddress,
                    titleNumber: invoiceData.titleNumber,
                    buyerName: invoiceData.buyerName,
                    sellerName: invoiceData.sellerName,
                    agentName: invoiceData.agentName
                });
                responseData = response.data;
            } else {
                // Use send-to-nmi endpoint for new invoices
                console.log('Sending new real estate invoice to NMI merchant portal');
                const response = await axios.post(route('invoice.send-to-nmi'), {
                    invoiceData: invoiceData,
                    recipientEmail: recipientEmail,
                    pdfBase64: base64data,
                    invoiceType: 'real_estate',
                    propertyAddress: invoiceData.propertyAddress,
                    titleNumber: invoiceData.titleNumber,
                    buyerName: invoiceData.buyerName,
                    sellerName: invoiceData.sellerName,
                    agentName: invoiceData.agentName
                });
                responseData = response.data;
            }
            
            console.log('Response from NMI:', responseData);

            if (responseData.success) {
                let successMessage = isEditing 
                    ? 'Invoice updated and sent to customer successfully!' 
                    : 'Invoice sent successfully!';
                
                toast.success(successMessage);
                
                // Use setTimeout to redirect after showing the toast
                setTimeout(() => {
                    router.get(route('user.invoices'));
                }, 2000); // Wait 2 seconds before redirecting
            } else {
                throw new Error(responseData.message || 'Failed to send invoice');
            }
        } catch (error) {
            console.error('Full error object:', error);
            console.error('Error response data:', error.response?.data);
            
            let errorMessage = 'Failed to send invoice';
            
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
                <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
                    {isEditing ? 'Edit and Resend Invoice' : 'Create Your Real Estate Invoice'}
                </h2>
            }
        >
            <div className="container md:max-w-4xl mx-auto md:py-10">
                
                {/* Email input section */}
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

                {/* Mobile-only buttons */}
                <div className="md:hidden flex justify-center flex-wrap gap-4 my-8">
                    <button 
                        onClick={handleDownloadPdf}
                        className="px-4 py-2 bg-green-500 text-white rounded-md text-sm md:text-base hover:bg-green-600 transition-all duration-300 flex items-center"
                        disabled={sending}
                    >
                        <FontAwesomeIcon icon={faDownload} className="mr-2" />
                        Download PDF
                    </button>
                    <button
                        onClick={handleSaveTemplate}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm md:text-base hover:bg-indigo-600 transition-all duration-300 flex items-center"
                        disabled={sending}
                    >
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        Save Template
                    </button>

                    <button
                        className="px-4 py-2 bg-purple-500 text-white rounded-md text-sm md:text-base hover:bg-purple-600 transition-all duration-300 flex items-center"
                        onClick={() => document.getElementById('template-upload').click()}
                    >
                        <FontAwesomeIcon icon={faUpload} className="mr-2" />
                        Upload Template
                        <input
                            id="template-upload"
                            type="file"
                            accept=".json,.template"
                            onChange={handleFileUpload}
                            className="sr-only"
                        />
                    </button>
                </div>

                <RealEstateInvoicePage 
                    data={invoiceData} 
                    onChange={handleInvoiceUpdate} 
                />


                {/* Email input section */}{/* Email input section */}
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

export default RealEstateInvoice;
