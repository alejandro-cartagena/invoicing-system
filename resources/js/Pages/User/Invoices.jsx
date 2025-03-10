import React from 'react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit, faDownload, faEye, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import { generatePDF } from '@/utils/pdfGenerator';

const Invoices = ({ invoices }) => {
    const handleEdit = (invoice) => {
        // Navigate to the edit page with the invoice ID
        router.get(route('user.general-invoice.edit', invoice.id));
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
                const invoiceData = response.data.invoiceData;
                
                // Generate the PDF using the shared function
                const pdfBlob = await generatePDF(invoiceData);
                
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

    return (
        <UserAuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Your Invoices
                    </h2>
                    <Link
                        href={route('user.general-invoice')}
                        className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600 transition-all duration-300"
                    >
                        Create New Invoice
                    </Link>
                </div>
            }
        >
            <Head title="Invoices" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Invoice #
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
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {invoice.invoice_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {invoice.client_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                ${parseFloat(invoice.total).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(invoice.invoice_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(invoice.due_date).toLocaleDateString()}
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
                                    
                                    {invoices.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                                                No invoices found. <Link href={route('user.general-invoice')} className="text-indigo-600 hover:text-indigo-900">Create your first invoice</Link>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
};

export default Invoices;
