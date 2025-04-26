import React from 'react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faDownload, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import Document from '@/Components/GeneralInvoiceComponents/Document';
import Page from '@/Components/GeneralInvoiceComponents/Page';
import View from '@/Components/GeneralInvoiceComponents/View';
import Text from '@/Components/GeneralInvoiceComponents/Text';
import { format } from 'date-fns';

const ViewInvoice = ({ invoice }) => {
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            return format(date, 'MMM dd, yyyy');
        } catch (e) {
            return dateStr;
        }
    };

    const formatCurrency = (amount) => {
        return parseFloat(amount).toFixed(2);
    };

    // Function to render a read-only field with label
    const ReadOnlyField = ({ label, value, className = "" }) => (
        <div className={`mb-4 ${className}`}>
            <div className="text-sm md:text-base font-medium text-gray-600">{label}</div>
            <div className="mt-1 md:text-lg text-gray-900">{value || '-'}</div>
        </div>
    );

    // Function to determine if it's a real estate invoice
    const isRealEstate = invoice.invoice_type === 'real_estate';

    // Calculate totals for display
    const subtotal = parseFloat(invoice.subtotal || 0);
    const taxAmount = parseFloat(invoice.tax_amount || 0);
    const total = parseFloat(invoice.total || 0);

    // Extract invoice data
    const invoiceData = invoice.invoice_data || {};

    return (
        <UserAuthenticatedLayout
            header={
                <div className="flex justify-center items-center">
                    <h2 className="text-xl md:text-2xl font-semibold leading-tight text-gray-800">
                        View Invoice
                    </h2>
                </div>
            }
        >
            <Head title="View Invoice" />

            <div className="py-12">
                <div className="container md:max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="mb-6 flex items-center justify-between">
                        <Link 
                            href={route('user.invoices')} 
                            className="flex items-center md:text-lg text-blue-600 hover:text-blue-800"
                        >
                            <FontAwesomeIcon icon={faChevronLeft} className="mr-2" />
                            Back to Invoices
                        </Link>
                        
                        <div className="flex space-x-4">
                            <Link 
                                href={route('user.invoice.download', invoice.id)}
                                className="px-4 py-2 bg-green-500 text-white rounded-md text-sm md:text-base hover:bg-green-600 transition-all duration-300 flex items-center"
                            >
                                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                                Download PDF
                            </Link>
                            {invoice.status !== 'closed' && invoice.status !== 'paid' && (
                                <>
                                    {invoice.invoice_type === 'real_estate' ? (
                                        <Link 
                                            href={route('user.real-estate-invoice.edit', invoice.id)}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm md:text-base hover:bg-blue-600 transition-all duration-300 flex items-center"
                                        >
                                            <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                                            Edit & Resend
                                        </Link>
                                    ) : (
                                        <Link 
                                            href={route('user.general-invoice.edit', invoice.id)}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm md:text-base hover:bg-blue-600 transition-all duration-300 flex items-center"
                                        >
                                            <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                                            Edit & Resend
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <Document>
                                <Page className="p-9">
                                    {/* Header Section */}
                                    <div className="flex flex-col-reverse md:flex-row justify-between mb-10">
                                        <div className="w-full md:w-1/2">
                                            {invoiceData.logo && (
                                                <img 
                                                    src={invoiceData.logo} 
                                                    alt="Company Logo" 
                                                    className="max-w-[200px] max-h-[100px] mb-4"
                                                />
                                            )}
                                            <div className="text-xl md:text-2xl font-bold mb-1">{invoiceData.yourCompanyName || '-'}</div>
                                            <div className="md:text-lg">{invoiceData.name || '-'}</div>
                                            <div className="md:text-lg">{invoiceData.companyAddress || '-'}</div>
                                            <div className="md:text-lg">{invoiceData.companyAddress2 || '-'}</div>
                                            <div className="md:text-lg">{invoiceData.companyCountry || '-'}</div>
                                        </div>
                                        <div className="w-full md:w-1/2 md:text-right mb-10 md:mb-0">
                                            <div className="text-4xl md:text-5xl font-bold mb-6">{invoiceData.title || 'INVOICE'}</div>
                                            <div className="md:text-lg text-gray-700 mb-1">
                                                <span className="font-semibold">Status: </span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold
                                                    ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                                    invoice.status === 'overdue' ? 'bg-orange-100 text-orange-800' :
                                                    invoice.status === 'closed' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}
                                                >
                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="md:text-lg text-gray-700 mb-1">
                                                <span className="font-semibold">Invoice #: </span>
                                                {invoice.nmi_invoice_id || '-'}
                                            </div>
                                            <div className="md:text-lg text-gray-700 mb-1">
                                                <span className="font-semibold">Invoice Date: </span>
                                                {formatDate(invoiceData.invoiceDate)}
                                            </div>
                                            <div className="md:text-lg text-gray-700 mb-1">
                                                <span className="font-semibold">Due Date: </span>
                                                {formatDate(invoiceData.invoiceDueDate)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Client Information */}
                                    <div className="flex flex-col md:flex-row justify-between mb-10">
                                        <div className="w-full md:w-1/2 mb-6 md:mb-0">
                                            <div className="text-lg md:text-xl font-semibold mb-2">Bill To:</div>
                                            <div className="md:text-lg mb-1">{invoiceData.firstName} {invoiceData.lastName}</div>
                                            <div className="md:text-lg mb-1">{invoiceData.companyName}</div>
                                            <div className="md:text-lg mb-1">{invoiceData.clientAddress}</div>
                                            <div className="md:text-lg mb-1">
                                                {[
                                                    invoiceData.city, 
                                                    invoiceData.state, 
                                                    invoiceData.zip
                                                ].filter(Boolean).join(', ')}
                                            </div>
                                            <div className="md:text-lg">{invoiceData.country || invoiceData.clientCountry}</div>
                                        </div>

                                        {/* Real Estate Information (if applicable) */}
                                        {isRealEstate && (
                                            <div className="w-full md:text-right md:w-1/2">
                                                <div className="text-lg md:text-xl font-semibold mb-2">Property Information:</div>
                                                <ReadOnlyField label="Property Address" value={invoiceData.propertyAddress} />
                                                <ReadOnlyField label="Title Number" value={invoiceData.titleNumber} />
                                                <ReadOnlyField label="Buyer Name" value={invoiceData.buyerName} />
                                                <ReadOnlyField label="Seller Name" value={invoiceData.sellerName} />
                                                <ReadOnlyField label="Agent Name" value={invoiceData.agentName} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Invoice Items */}
                                    <div className="mb-10 md:overflow-x-visible md:whitespace-normal overflow-x-auto whitespace-nowrap">
                                        <div className="bg-gray-700 text-white p-3 grid grid-cols-12 mb-2  min-w-[600px]">
                                            <div className="col-span-6 md:text-base font-medium">Description</div>
                                            <div className="col-span-2 text-right md:text-base font-medium">Quantity</div>
                                            <div className="col-span-2 text-right md:text-base font-medium">Rate</div>
                                            <div className="col-span-2 text-right md:text-base font-medium">Amount</div>
                                        </div>
                                        
                                        {invoiceData.productLines && invoiceData.productLines.map((item, index) => (
                                            <div key={index} className="grid grid-cols-12 border-b py-2 md:py-3 md:text-lg  min-w-[600px]">
                                                <div className="col-span-6">{item.description}</div>
                                                <div className="col-span-2 text-right">{item.quantity}</div>
                                                <div className="col-span-2 text-right">${formatCurrency(item.rate)}</div>
                                                <div className="col-span-2 text-right">
                                                    ${formatCurrency(parseFloat(item.quantity) * parseFloat(item.rate))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="flex justify-end mb-10">
                                        <div className="w-full md:w-1/3">
                                            <div className="grid grid-cols-2 border-b py-2 md:py-3 md:text-lg">
                                                <div>Subtotal</div>
                                                <div className="text-right">${formatCurrency(subtotal)}</div>
                                            </div>
                                            <div className="grid grid-cols-2 border-b py-2 md:py-3 md:text-lg">
                                                <div>Tax ({invoice.tax_rate}%)</div>
                                                <div className="text-right">${formatCurrency(taxAmount)}</div>
                                            </div>
                                            <div className="grid grid-cols-2 bg-gray-100 font-bold py-2 md:py-3 md:text-lg">
                                                <div>Total</div>
                                                <div className="text-right">${formatCurrency(total)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Notes & Terms */}
                                    {(invoiceData.notes || invoiceData.term) && (
                                        <div className="mb-6">
                                            {invoiceData.notes && (
                                                <div className="mb-4">
                                                    <div className="md:text-lg font-semibold mb-1">{invoiceData.notesLabel || 'Notes'}</div>
                                                    <div className="md:text-base text-gray-700">{invoiceData.notes}</div>
                                                </div>
                                            )}
                                            
                                            {invoiceData.term && (
                                                <div>
                                                    <div className="md:text-lg font-semibold mb-1">{invoiceData.termLabel || 'Terms & Conditions'}</div>
                                                    <div className="md:text-base text-gray-700">{invoiceData.term}</div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Page>
                            </Document>
                        </div>
                    </div>
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
};

export default ViewInvoice;
