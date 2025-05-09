import React, { useState, useEffect } from 'react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faX, faEdit, faPenToSquare, faDownload, faEye, faPaperPlane, faSearch, faChevronLeft, faChevronRight, faFilter } from '@fortawesome/free-solid-svg-icons';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { generatePDF, generateRealEstatePDF } from '@/utils/pdfGenerator';
import { format, parseISO } from 'date-fns';

const Invoices = ({ invoices: initialInvoices }) => {
    const [invoices, setInvoices] = useState(initialInvoices);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const invoicesPerPage = 10;
    
    // Status filter state
    const [statusFilters, setStatusFilters] = useState({
        sent: true,
        overdue: true,
        paid: true,
        closed: false
    });
    
    // Combined filter function that applies both search and status filters
    const applyFilters = () => {
        return invoices.filter(invoice => 
            // Apply search filter
            (
                (invoice.nmi_invoice_id && invoice.nmi_invoice_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (invoice.client_name && invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
            ) &&
            // Apply status filter
            statusFilters[invoice.status]
        );
    };
    
    const filteredInvoices = applyFilters();

    // Calculate pagination
    const indexOfLastInvoice = currentPage * invoicesPerPage;
    const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
    const displayedInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
    const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
    
    // Reset to first page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilters]);

    useEffect(() => {
        // Check if Pusher is available
        if (window.Pusher) {
            const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
            const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;
            
            const pusher = new window.Pusher(pusherKey, {
                cluster: pusherCluster
            });
            
            // Subscribe to the notification channel
            const channel = pusher.subscribe('notification');
            
            // Listen for payment notification events
            channel.bind('payment.notification', function(data) {
                console.log('Payment notification received in Invoices component:', data);
                
                // Update the invoice status if we find a matching nmi_invoice_id
                setInvoices(currentInvoices => 
                    currentInvoices.map(invoice => {
                        if (invoice.nmi_invoice_id === data.nmi_invoice_id) {
                            return {
                                ...invoice,
                                status: 'paid',
                            };
                        }
                        return invoice;
                    })
                );
            });

            // Cleanup function
            return () => {
                channel.unbind('payment.notification');
                pusher.unsubscribe('notification');
            };
        }
    }, []); // Empty dependency array since we only want this to run once on mount

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };
    
    // Handle status filter changes
    const handleStatusFilterChange = (status) => {
        setStatusFilters(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };
    
    // Select/deselect all filters
    const handleSelectAllFilters = (selected) => {
        setStatusFilters({
            sent: selected,
            overdue: selected,
            paid: selected,
            closed: selected
        });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
    };

    const handleClose = (invoiceId, nmiInvoiceId) => {
        // Include NMI invoice ID in the confirmation message if available
        const invoiceIdentifier = nmiInvoiceId 
            ? `${nmiInvoiceId}` 
            : invoiceId;
        
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to close invoice ${invoiceIdentifier}. This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, close it!'
        }).then((result) => {
            if (result.isConfirmed) {
                
                axios.post(route('user.invoice.close', invoiceId))
                    .then(response => {
                        if (response.data.success) {
                            Swal.fire(
                                'Closed!',
                                'Invoice has been closed.',
                                'success'
                            );
                            
                            // Update the invoices state to reflect the closed invoice
                            setInvoices(prevInvoices => 
                                prevInvoices.map(invoice => 
                                    invoice.id === invoiceId 
                                        ? { ...invoice, status: 'closed' } 
                                        : invoice
                                )
                            );
                        } else {
                            Swal.fire(
                                'Error!',
                                response.data.message || 'Failed to close invoice.',
                                'error'
                            );
                        }
                    })
                    .catch(error => {
                        console.error('Error closing invoice:', error);
                        Swal.fire(
                            'Error!',
                            error.response?.data?.message || 'Failed to close invoice.',
                            'error'
                        );
                    });
            }
        });
    };

    const handleDownload = async (invoice) => {
        try {
            // Show loading indicator
            Swal.fire({
                title: 'Generating PDF...',
                text: 'Please wait while we prepare your invoice for download.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // Fetch the invoice data
            const response = await axios.get(route('user.invoice.download', invoice.id));
            
            if (response.data.success) {
                // Get the invoice data
                let invoiceData = response.data.invoiceData;
                let pdfBlob;
                
                // For real estate invoices, ensure the real estate fields are included
                if (invoice.invoice_type === 'real_estate') {
                    // Get the real estate fields from invoice_data instead of the root invoice object
                    invoiceData = {
                        ...invoiceData,
                        propertyAddress: invoice.invoice_data.propertyAddress,
                        titleNumber: invoice.invoice_data.titleNumber,
                        buyerName: invoice.invoice_data.buyerName,
                        sellerName: invoice.invoice_data.sellerName,
                        agentName: invoice.invoice_data.agentName
                    };
                    pdfBlob = await generateRealEstatePDF(invoiceData);
                } else {
                    pdfBlob = await generatePDF(invoiceData);
                }
                
                // Create a URL for the blob
                const url = window.URL.createObjectURL(pdfBlob);
                
                // Create a temporary link element
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Invoice-${invoice.nmi_invoice_id}.pdf`);
                
                // Append to the document, click it, and remove it
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Clean up the URL object
                window.URL.revokeObjectURL(url);
                
                // Close the loading indicator
                Swal.close();
                
                // Show success message
                Swal.fire({
                    title: 'Success!',
                    text: 'Invoice downloaded successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error('Failed to fetch invoice data');
            }
        } catch (error) {
            console.error('Download error:', error);
            Swal.fire({
                title: 'Error!',
                text: 'Failed to download invoice. Please try again.',
                icon: 'error'
            });
        }
    };

    const handleResend = async (invoice) => {
        if (invoice.status === 'closed' || invoice.status === 'paid') return;
        
        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'Resend Invoice?',
            text: `Are you sure you want to resend invoice ${invoice.nmi_invoice_id} to ${invoice.client_email}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, resend it!'
        });
    
        if (result.isConfirmed) {
            // Show loading state
            Swal.fire({
                title: 'Resending Invoice...',
                text: 'Please wait while we process your request.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
    
            try {
                // First, generate the PDF
                let pdfBlob;
                if (invoice.invoice_type === 'real_estate') {
                    pdfBlob = await generateRealEstatePDF(invoice.invoice_data);
                } else {
                    pdfBlob = await generatePDF(invoice.invoice_data);
                }

                // Convert blob to base64
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                });
                reader.readAsDataURL(pdfBlob);
                const base64pdf = await base64Promise;

                // Prepare the data for sending
                const data = {
                    pdfBase64: base64pdf,
                    recipientEmail: invoice.client_email,
                    // Include real estate fields if needed
                    ...(invoice.invoice_type === 'real_estate' && {
                        propertyAddress: invoice.invoice_data.propertyAddress,
                        titleNumber: invoice.invoice_data.titleNumber,
                        buyerName: invoice.invoice_data.buyerName,
                        sellerName: invoice.invoice_data.sellerName,
                        agentName: invoice.invoice_data.agentName
                    })
                };

                // Use axios instead of router.post
                const response = await axios.post(route('user.invoice.resend', invoice.id), data);
                
                if (response.data.success) {
                    // Show success message
                    Swal.fire({
                        title: 'Success!',
                        text: 'Invoice has been resent successfully.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    throw new Error(response.data.message || 'Failed to resend invoice');
                }
            } catch (error) {
                console.error('Resend error:', error);
                // Show error message
                Swal.fire({
                    title: 'Error!',
                    text: error.response?.data?.message || 'Failed to resend invoice. Please try again.',
                    icon: 'error'
                });
            }
        }
    };

    // Add this function to get a friendly display name for the invoice type
    const getInvoiceTypeDisplay = (type) => {
        switch(type) {
            case 'general':
                return 'General';
            case 'real_estate':
                return 'Real Estate';
            default:
                return type.charAt(0).toUpperCase() + type.slice(1);
        }
    };

    // Add this function to get a status filter button class
    const getFilterButtonClass = (status) => {
        const baseClass = "px-3 py-1 text-xs font-medium rounded-md mr-2 mb-2 cursor-pointer ";
        const activeClass = {
            sent: "bg-yellow-100 text-yellow-800 border border-yellow-300",
            overdue: "bg-orange-100 text-orange-800 border border-orange-300",
            paid: "bg-green-100 text-green-800 border border-green-300",
            closed: "bg-red-100 text-red-800 border border-red-300"
        };
        const inactiveClass = "bg-gray-100 text-gray-500 border border-gray-200";
        
        return baseClass + (statusFilters[status] ? activeClass[status] : inactiveClass);
    };

    return (
        <UserAuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Your Invoices
                    </h2>
                </div>
            }
        >
            <Head title="Invoices" />

            <div className="container py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Search and Filter Controls */}
                    <div className="mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start space-y-4 md:space-y-0 md:items-start">
                            <div className="w-full md:w-auto">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search invoices..."
                                        className="w-full md:w-[300px] p-2 pl-10 border rounded"
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                        }}
                                    />
                                    <FontAwesomeIcon 
                                        icon={faSearch} 
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                    />
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    Search by client name or invoice number
                                </p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
                                <Link
                                    href={route('user.general-invoice')}
                                    className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition-all duration-300 text-center"
                                >
                                    Create General Invoice
                                </Link>
                                <Link
                                    href={route('user.real-estate-invoice')}
                                    className="px-4 py-2 bg-green-500 text-white rounded-md text-sm hover:bg-green-600 transition-all duration-300 text-center"
                                >
                                    Create Real Estate Invoice
                                </Link>
                            </div>
                        </div>
                        
                        {/* Status Filter Controls */}
                        <div className="mt-4">
                            <div className="flex items-center mb-2">
                                <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-500" />
                                <span className="text-sm font-medium text-gray-700">Filter by status:</span>
                                <button
                                    onClick={() => handleSelectAllFilters(true)}
                                    className="ml-4 text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Select All
                                </button>
                                <button
                                    onClick={() => handleSelectAllFilters(false)}
                                    className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                                >
                                    Clear All
                                </button>
                            </div>
                            <div className="flex flex-wrap">
                                <div
                                    className={getFilterButtonClass('sent')}
                                    onClick={() => handleStatusFilterChange('sent')}
                                >
                                    <span className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={statusFilters.sent} 
                                            onChange={() => {}} 
                                            className="mr-2 h-4 w-4" 
                                        />
                                        Sent
                                    </span>
                                </div>
                                <div
                                    className={getFilterButtonClass('overdue')}
                                    onClick={() => handleStatusFilterChange('overdue')}
                                >
                                    <span className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={statusFilters.overdue} 
                                            onChange={() => {}} 
                                            className="mr-2 h-4 w-4" 
                                        />
                                        Overdue
                                    </span>
                                </div>
                                <div
                                    className={getFilterButtonClass('paid')}
                                    onClick={() => handleStatusFilterChange('paid')}
                                >
                                    <span className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={statusFilters.paid} 
                                            onChange={() => {}} 
                                            className="mr-2 h-4 w-4" 
                                        />
                                        Paid
                                    </span>
                                </div>
                                <div
                                    className={getFilterButtonClass('closed')}
                                    onClick={() => handleStatusFilterChange('closed')}
                                >
                                    <span className="flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={statusFilters.closed} 
                                            onChange={() => {}} 
                                            className="mr-2 h-4 w-4" 
                                        />
                                        Closed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white xl:overflow-x-visible xl:whitespace-normal overflow-x-auto whitespace-nowrap shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Invoice #
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Due Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {displayedInvoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link 
                                                    href={route('user.invoice.view', invoice.id)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    {invoice.nmi_invoice_id}
                                                </Link>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${invoice.invoice_type === 'real_estate' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {getInvoiceTypeDisplay(invoice.invoice_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {invoice.first_name && invoice.last_name 
                                                    ? `${invoice.first_name} ${invoice.last_name}`
                                                    : invoice.company_name || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                ${parseFloat(invoice.total).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {formatDate(invoice.invoice_data.invoiceDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {formatDate(invoice.invoice_data.invoiceDueDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                                      invoice.status === 'overdue' ? 'bg-orange-100 text-orange-800' :
                                                      invoice.status === 'closed' ? 'bg-red-100 text-red-800' :
                                                      'bg-yellow-100 text-yellow-800'}`}>
                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-4">

                                                    {/* Close Invoice Button */}
                                                    <button 
                                                        onClick={() => invoice.status !== 'closed' || invoice.status !== 'paid' ? handleClose(invoice.id, invoice.nmi_invoice_id) : null}
                                                        className={`${invoice.status === 'closed' || invoice.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'} relative group`}
                                                        aria-label={invoice.status === 'closed' ? 'Invoice Closed' : invoice.status === 'paid' ? 'Invoice Paid' : 'Close Invoice'}
                                                        disabled={invoice.status === 'closed' || invoice.status === 'paid'}
                                                    >
                                                        <FontAwesomeIcon icon={faX} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            {invoice.status === 'closed' ? 'Invoice Closed' : invoice.status === 'paid' ? 'Invoice Paid' : 'Close Invoice'}
                                                        </span>
                                                    </button>

                                                    {/* Download Invoice Button */}
                                                    <button 
                                                        onClick={() => handleDownload(invoice)}
                                                        className='text-green-600 hover:text-green-900 relative group'
                                                        aria-label='Download Invoice'
                                                    >
                                                        <FontAwesomeIcon icon={faDownload} />
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap hidden group-hover:block">
                                                            {'Download Invoice'}
                                                        </span>
                                                    </button>

                                                    {/* Edit Invoice Button */}
                                                    <button 
                                                        onClick={() => {
                                                            if (invoice.status === 'closed' || invoice.status === 'paid') return;
                                                            
                                                            const editRoute = invoice.invoice_type === 'real_estate'
                                                                ? route('user.real-estate-invoice.edit', invoice.id)
                                                                : route('user.general-invoice.edit', invoice.id);
                                                            router.get(editRoute);
                                                        }}
                                                        className={`${invoice.status === 'closed' || invoice.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'} relative group`}
                                                        aria-label={invoice.status === 'closed' ? 'Cannot Edit Closed Invoice' : invoice.status === 'paid' ? 'Cannot Edit Paid Invoice' : 'Edit Invoice'}
                                                        disabled={invoice.status === 'closed' || invoice.status === 'paid'}
                                                    >
                                                        <FontAwesomeIcon icon={faPenToSquare} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            {invoice.status === 'closed' ? 'Cannot Edit Closed Invoice' : invoice.status === 'paid' ? 'Cannot Edit Paid Invoice' : 'Edit'}
                                                        </span>
                                                    </button>

                                                    {/* Resend Invoice Button */}
                                                    <button 
                                                        onClick={() => handleResend(invoice)}
                                                        className={`${invoice.status === 'closed' || invoice.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-900'} relative group`}
                                                        aria-label={invoice.status === 'closed' ? 'Cannot Resend Closed Invoice' : invoice.status === 'paid' ? 'Cannot Resend Paid Invoice' : 'Resend Invoice'}
                                                        disabled={invoice.status === 'closed' || invoice.status === 'paid'}
                                                    >
                                                        <FontAwesomeIcon icon={faPaperPlane} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            {invoice.status === 'closed' ? 'Cannot Resend Closed Invoice' : invoice.status === 'paid' ? 'Cannot Resend Paid Invoice' : 'Resend'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {displayedInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                {(searchTerm || Object.values(statusFilters).some(v => !v)) 
                                                    ? 'No invoices match your current filters.' 
                                                    : 'No invoices found.'}
                                                {!searchTerm && !Object.values(statusFilters).some(v => v) && invoices.length === 0 && 
                                                    <Link href={route('user.general-invoice')} className="text-indigo-600 hover:text-indigo-900">
                                                        Create your first invoice
                                                    </Link>
                                                }
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Add Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-4 flex justify-center items-center">
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`px-3 py-1 rounded ${
                                        currentPage === 1
                                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                    }`}
                                >
                                    <FontAwesomeIcon icon={faChevronLeft} />
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 rounded ${
                                            currentPage === page
                                                ? "bg-gray-800 text-white"
                                                : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ))}
                                
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`px-3 py-1 rounded ${
                                        currentPage === totalPages
                                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                    }`}
                                >
                                    <FontAwesomeIcon icon={faChevronRight} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
};

export default Invoices;
