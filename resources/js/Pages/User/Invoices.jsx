import React, { useState } from 'react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faDownload, faEye, faPaperPlane, faSearch, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { generatePDF, generateRealEstatePDF } from '@/utils/pdfGenerator';
import { format, parseISO } from 'date-fns';

const Invoices = ({ invoices }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const invoicesPerPage = 10;

    // Filter invoices based on search
    const filteredInvoices = invoices.filter(invoice => 
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination
    const indexOfLastInvoice = currentPage * invoicesPerPage;
    const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
    const displayedInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
    const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
      };

    const handleDelete = (invoiceId, invoiceNumber) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete invoice ${invoiceNumber}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('user.invoice.destroy', invoiceId), {
                    onSuccess: () => {
                        Swal.fire(
                            'Deleted!',
                            'Invoice has been deleted.',
                            'success'
                        );
                    },
                    onError: () => {
                        Swal.fire(
                            'Error!',
                            'Failed to delete invoice.',
                            'error'
                        );
                    },
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
                link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`);
                
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

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Add Search Bar */}
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
                                            setCurrentPage(1); // Reset to first page on search
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
                                    className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-all duration-300 text-center"
                                >
                                    Create General Invoice
                                </Link>
                                <Link
                                    href={route('user.real-estate-invoice')}
                                    className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition-all duration-300 text-center"
                                >
                                    Create Real Estate Invoice
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
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
                                                {invoice.invoice_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                    ${invoice.invoice_type === 'real_estate' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {getInvoiceTypeDisplay(invoice.invoice_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {invoice.client_name}
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
                                                      invoice.status === 'overdue' ? 'bg-red-100 text-red-800' : 
                                                      'bg-yellow-100 text-yellow-800'}`}>
                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-4">
                                                    
                                                    <button 
                                                        onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                                                        className="text-red-600 hover:text-red-900 relative group"
                                                        aria-label="Delete Invoice"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            Delete
                                                        </span>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleDownload(invoice)}
                                                        className="text-green-600 hover:text-green-900 relative group"
                                                        aria-label="Download Invoice"
                                                    >
                                                        <FontAwesomeIcon icon={faDownload} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            Download
                                                        </span>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => router.get(route('user.general-invoice.edit', invoice.id))}
                                                        className="text-indigo-600 hover:text-indigo-900 relative group"
                                                        aria-label="Resend Invoice"
                                                    >
                                                        <FontAwesomeIcon icon={faPaperPlane} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            Resend
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {displayedInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                {searchTerm ? 'No invoices found matching your search.' : 'No invoices found. '}
                                                {!searchTerm && <Link href={route('user.general-invoice')} className="text-indigo-600 hover:text-indigo-900">Create your first invoice</Link>}
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
