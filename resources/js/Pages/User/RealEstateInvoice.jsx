import React, { useState, useEffect } from 'react';
import RealEstateInvoicePage from '@/Components/GeneralInvoiceComponents/RealEstateInvoicePage';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { router, usePage } from '@inertiajs/react';
import { LoaderIcon } from '@/Components/Icons';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { format } from 'date-fns';
import { generatePDF, convertBlobToBase64, calculateBase64Size } from '@/utils/pdfGenerator.jsx';
import FileSaver from 'file-saver';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { saveTemplate, handleTemplateUpload } from '@/utils/templateHandler';
import { generateRealEstatePDF } from '@/utils/pdfGenerator.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faEnvelope, faSave, faUpload, faUsers } from '@fortawesome/free-solid-svg-icons';
import CustomerSelector from '@/Components/CustomerSelector';
import CustomerModal from '@/Components/CustomerModal';

const MAX_IMAGE_SIZE_MB = 1; // Maximum image size in MB
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024; // Convert to bytes

const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

const RealEstateInvoice = () => {
    // Get props from the page
    const { invoiceData: initialInvoiceData, recipientEmail: initialEmail, invoiceId, isEditing: initialIsEditing, isResending: initialIsResending } = usePage().props;
    
    const [invoiceData, setInvoiceData] = useState(initialInvoiceData || null);
    const [recipientEmail, setRecipientEmail] = useState(initialEmail || '');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [sending, setSending] = useState(false);
    const [isEditing, setIsEditing] = useState(initialIsEditing || false);
    const [isResending, setIsResending] = useState(initialIsResending || false);
    const [invoiceKey, setInvoiceKey] = useState(0);

    // Preselect customer from query params if provided
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const customerId = params.get('customer_id');
        const customerName = params.get('customer_name');
        const customerEmail = params.get('customer_email');
        if (customerId && customerEmail) {
            const seed = { id: Number(customerId), name: customerName || customerEmail, email: customerEmail };
            setSelectedCustomer(seed);
            setRecipientEmail(customerEmail);
            // Fetch full customer details by email and apply prefill
            (async () => {
                try {
                    const customerResponse = await axios.get(route('api.customers'), {
                        params: { search: customerEmail.trim() }
                    });
                    const matchingCustomer = (customerResponse.data?.data || customerResponse.data || [])
                        .find(c => c.email?.toLowerCase() === customerEmail.trim().toLowerCase());
                    if (matchingCustomer) {
                        setSelectedCustomer(matchingCustomer);
                        applyCustomerPrefill(matchingCustomer);
                    } else {
                        if (customerName) {
                            const [first, ...rest] = customerName.split(' ');
                            applyCustomerPrefill({ first_name: first || '', last_name: rest.join(' ') || '' });
                        }
                    }
                } catch (e) {
                    // Ignore API errors; user can still select manually
                }
            })();
        }
    }, []);

    const buildPrefillFromCustomer = (customer) => {
        const c = customer?.full_data || customer || {};
        const addressLine = [c.address, c.address2].filter(Boolean).join(', ');
        return {
            firstName: c.first_name || '',
            lastName: c.last_name || '',
            companyName: c.company || '',
            clientAddress: addressLine || '',
            city: c.city || '',
            state: c.state || '',
            zip: c.postal_code || '',
            country: c.country || ''
        };
    };

    const applyCustomerPrefill = (customer) => {
        const prefill = buildPrefillFromCustomer(customer);
        setInvoiceData((prev) => ({ ...(prev || {}), ...prefill }));
        setInvoiceKey((k) => k + 1);
    };

    const handleInvoiceUpdate = (invoice) => {
        setInvoiceData(invoice);
    };

    const handleCustomerModalSelect = (customer) => {
        setSelectedCustomer(customer);
        setRecipientEmail(customer.email);
        applyCustomerPrefill(customer);
        setShowCustomerModal(false);
    };

    const handleInlineCustomerSelect = (customer) => {
        setSelectedCustomer(customer);
        setRecipientEmail(customer.email);
        applyCustomerPrefill(customer);
    };

    const handleSendInvoice = async () => {
        // Email validation
        if (!recipientEmail.trim()) {
            toast.error('Please enter a recipient email address');
            return;
        }

        if (!isValidEmail(recipientEmail)) {
            toast.error('Please enter a valid email address');
            return;
        }

        // Check if invoice exists and has at least one product line
        if (!invoiceData || !invoiceData.productLines || invoiceData.productLines.length === 0) {
            toast.error('Please add at least one item to the invoice');
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

        // Check if the recipient email belongs to an existing customer
        let customerToUse = selectedCustomer;
        if (!customerToUse && recipientEmail.trim()) {
            try {
                const customerResponse = await axios.get(route('api.customers'), {
                    params: { search: recipientEmail.trim() }
                });
                
                // Find exact email match
                const matchingCustomer = customerResponse.data.find(customer => 
                    customer.email.toLowerCase() === recipientEmail.trim().toLowerCase()
                );
                
                if (matchingCustomer) {
                    customerToUse = matchingCustomer;
                    // Optionally update the UI to show the found customer
                    setSelectedCustomer(matchingCustomer);
                }
            } catch (error) {
                console.log('Could not check for existing customer:', error);
                // Continue with invoice creation even if customer lookup fails
            }
        }
        try {
            // Generate PDF - Use generateRealEstatePDF instead of generatePDF
            const pdfBlob = await generateRealEstatePDF(invoiceData);

            // Check PDF size
            if (pdfBlob.size > 8 * 1024 * 1024) { // 8MB limit for the PDF
                throw new Error(`Generated PDF is too large (${(pdfBlob.size / (1024 * 1024)).toFixed(2)}MB). Try removing large images or reducing image quality.`);
            }

            // Convert to base64
            const base64data = await convertBlobToBase64(pdfBlob);

            // Determine which endpoint to use based on whether we're editing or creating
            let endpoint, responseData;
            
            if (isEditing && invoiceId) {
                // Use replace endpoint when editing
                const response = await axios.post(route('invoice.replace', invoiceId), {
                    invoiceData: invoiceData,
                    recipientEmail: recipientEmail,
                    pdfBase64: base64data,
                    invoiceType: 'real_estate',
                    customerId: customerToUse?.id || null,
                    propertyAddress: invoiceData.propertyAddress,
                    titleNumber: invoiceData.titleNumber,
                    buyerName: invoiceData.buyerName,
                    sellerName: invoiceData.sellerName,
                    agentName: invoiceData.agentName
                });
                responseData = response.data;
            } else {
                // Use send-to-nmi endpoint for new invoices
                const response = await axios.post(route('invoice.send-invoice'), {
                    invoiceData: invoiceData,
                    recipientEmail: recipientEmail,
                    pdfBase64: base64data,
                    invoiceType: 'real_estate',
                    customerId: customerToUse?.id || null,
                    propertyAddress: invoiceData.propertyAddress,
                    titleNumber: invoiceData.titleNumber,
                    buyerName: invoiceData.buyerName,
                    sellerName: invoiceData.sellerName,
                    agentName: invoiceData.agentName
                });
                responseData = response.data;
            }

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
                    {isEditing ? 'Edit and Resend Invoice' : 'Create Your Real Estate Invoice'}
                </h2>
            }
        >
            <div className="container md:max-w-4xl mx-auto md:py-10">
                
                {/* Customer/Email selection section */}
                <div className="hidden md:block mb-6 p-6 bg-white rounded shadow-md">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Customer or Enter Email
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <CustomerSelector
                                            selectedCustomer={selectedCustomer}
                                            onCustomerSelect={handleInlineCustomerSelect}
                                            onEmailChange={setRecipientEmail}
                                            email={recipientEmail}
                                            disabled={sending}
                                            placeholder="Search customers or enter email address..."
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCustomerModal(true)}
                                        disabled={sending}
                                        className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-all duration-300 flex items-center space-x-1 whitespace-nowrap"
                                        title="Browse all customers"
                                    >
                                        <FontAwesomeIcon icon={faUsers} />
                                        <span className="hidden sm:inline">Select Customer</span>
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={handleSendInvoice}
                                disabled={sending}
                                className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm md:text-base hover:bg-blue-600 transition-all duration-300 flex items-center mt-6 md:mt-0"
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
                        <p className="text-center md:text-left text-xs text-gray-500">
                            This will create an invoice in your NMI merchant portal and send an email with PDF to the recipient.
                        </p>
                    </div>
                </div>

                <RealEstateInvoicePage 
                    key={invoiceKey}
                    data={invoiceData} 
                    onChange={handleInvoiceUpdate} 
                />


                {/* Customer/Email selection section - Mobile */}
                <div className="block md:hidden mb-6 p-6 my-5 bg-white rounded shadow-md">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Customer or Enter Email
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <CustomerSelector
                                        selectedCustomer={selectedCustomer}
                                        onCustomerSelect={handleInlineCustomerSelect}
                                        onEmailChange={setRecipientEmail}
                                        email={recipientEmail}
                                        disabled={sending}
                                        placeholder="Search customers or enter email address..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowCustomerModal(true)}
                                    disabled={sending}
                                    className="px-3 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-all duration-300 flex items-center justify-center"
                                    title="Browse all customers"
                                >
                                    <FontAwesomeIcon icon={faUsers} />
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleSendInvoice}
                            disabled={sending}
                            className="w-full px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-all duration-300 flex items-center justify-center"
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
                        <p className="text-center text-xs text-gray-500">
                            This will create an invoice in your NMI merchant portal and send an email with PDF to the recipient.
                        </p>
                    </div>
                </div>
            </div>

            {/* Customer Selection Modal */}
            <CustomerModal
                show={showCustomerModal}
                onClose={() => setShowCustomerModal(false)}
                onSelectCustomer={handleCustomerModalSelect}
                selectedCustomerId={selectedCustomer?.id}
            />
        </UserAuthenticatedLayout>
    );
}

export default RealEstateInvoice;
