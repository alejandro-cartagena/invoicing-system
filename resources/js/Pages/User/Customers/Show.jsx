import React, { useState } from 'react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faArrowLeft,
    faUser,
    faBuilding,
    faEnvelope,
    faPhone,
    faMapMarkerAlt,
    faCalendarAlt,
    faEdit,
    faPlus,
    faDownload,
    faEye,
    faPaperPlane,
    faX,
    faPenToSquare,
    faSearch,
    faChevronLeft,
    faChevronRight,
    faTimes
} from '@fortawesome/free-solid-svg-icons';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { generatePDF, generateRealEstatePDF } from '@/utils/pdfGenerator';
import axios from 'axios';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import countryList from '@/data/countryList';
import statesList from '@/data/statesList';

const CustomerShow = ({ customer, stats }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showInvoiceTypeModal, setShowInvoiceTypeModal] = useState(false);
    const invoicesPerPage = 10;

    // Form for editing customer
    const { 
        data: editData, 
        setData: setEditData, 
        patch, 
        processing: editProcessing, 
        errors: editErrors, 
        reset: resetEdit, 
        clearErrors: clearEditErrors 
    } = useForm({
        email: customer.email || '',
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        company: customer.company || '',
        country: customer.country || '',
        state: customer.state || '',
        address: customer.address || '',
        address2: customer.address2 || '',
        city: customer.city || '',
        postal_code: customer.postal_code || '',
        phone_number: customer.phone_number || '',
    });

    // Filter invoices based on search
    const filteredInvoices = customer.invoices.filter(invoice => 
        (invoice.nmi_invoice_id && invoice.nmi_invoice_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (invoice.invoice_type && invoice.invoice_type.toLowerCase().includes(searchTerm.toLowerCase()))
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

    const openEditModal = () => {
        setEditData({
            email: customer.email || '',
            first_name: customer.first_name || '',
            last_name: customer.last_name || '',
            company: customer.company || '',
            country: customer.country || '',
            state: customer.state || '',
            address: customer.address || '',
            address2: customer.address2 || '',
            city: customer.city || '',
            postal_code: customer.postal_code || '',
            phone_number: customer.phone_number || '',
        });
        setShowEditModal(true);
    };

    const closeEditModal = () => {
        setShowEditModal(false);
        resetEdit();
        clearEditErrors();
    };

    const openInvoiceTypeModal = () => {
        setShowInvoiceTypeModal(true);
    };

    const closeInvoiceTypeModal = () => {
        setShowInvoiceTypeModal(false);
    };

    const navigateToInvoiceType = (type) => {
        const params = {
            customer_id: customer.id,
            customer_name: customer.full_name || customer.display_name || '',
            customer_email: customer.email || ''
        };
        setShowInvoiceTypeModal(false);
        if (type === 'real_estate') {
            router.get(route('user.real-estate-invoice'), params);
        } else {
            router.get(route('user.general-invoice'), params);
        }
    };

    const handleEditCustomer = (e) => {
        e.preventDefault();
        
        patch(route('user.customer.update', customer.id), {
            onStart: () => {
                // Close modal and reset form immediately when the request starts
                resetEdit();
                setShowEditModal(false);
            },
            onSuccess: () => {
                // Show success message after redirect completes
                Swal.fire({
                    title: 'Success!',
                    text: 'Customer updated successfully.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            onError: () => {
                // Reopen modal if there's an error
                setShowEditModal(true);
                Swal.fire({
                    title: 'Error!',
                    text: 'Failed to update customer. Please check the form and try again.',
                    icon: 'error'
                });
            }
        });
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const getStatusBadgeClass = (status) => {
        const baseClass = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full ";
        switch(status) {
            case 'paid':
                return baseClass + "bg-green-100 text-green-800";
            case 'overdue':
                return baseClass + "bg-orange-100 text-orange-800";
            case 'closed':
                return baseClass + "bg-red-100 text-red-800";
            default:
                return baseClass + "bg-yellow-100 text-yellow-800";
        }
    };

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

    const handleDownload = async (invoice) => {
        try {
            Swal.fire({
                title: 'Generating PDF...',
                text: 'Please wait while we prepare your invoice for download.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await axios.get(route('user.invoice.download', invoice.id));
            
            if (response.data.success) {
                let invoiceData = response.data.invoiceData;
                let pdfBlob;
                
                if (invoice.invoice_type === 'real_estate') {
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
                
                const url = window.URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', `Invoice-${invoice.nmi_invoice_id}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                Swal.close();
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
        
        const result = await Swal.fire({
            title: 'Resend Invoice?',
            text: `Are you sure you want to resend invoice ${invoice.nmi_invoice_id} to ${customer.email}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, resend it!'
        });
    
        if (result.isConfirmed) {
            Swal.fire({
                title: 'Resending Invoice...',
                text: 'Please wait while we process your request.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
    
            try {
                let pdfBlob;
                if (invoice.invoice_type === 'real_estate') {
                    pdfBlob = await generateRealEstatePDF(invoice.invoice_data);
                } else {
                    pdfBlob = await generatePDF(invoice.invoice_data);
                }

                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                });
                reader.readAsDataURL(pdfBlob);
                const base64pdf = await base64Promise;

                const data = {
                    pdfBase64: base64pdf,
                    recipientEmail: customer.email,
                    ...(invoice.invoice_type === 'real_estate' && {
                        propertyAddress: invoice.invoice_data.propertyAddress,
                        titleNumber: invoice.invoice_data.titleNumber,
                        buyerName: invoice.invoice_data.buyerName,
                        sellerName: invoice.invoice_data.sellerName,
                        agentName: invoice.invoice_data.agentName
                    })
                };

                const response = await axios.post(route('user.invoice.resend', invoice.id), data);
                
                if (response.data.success) {
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
                Swal.fire({
                    title: 'Error!',
                    text: error.response?.data?.message || 'Failed to resend invoice. Please try again.',
                    icon: 'error'
                });
            }
        }
    };

    const handleClose = (invoice) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to close invoice ${invoice.nmi_invoice_id}. This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, close it!'
        }).then((result) => {
            if (result.isConfirmed) {
                axios.post(route('user.invoice.close', invoice.id))
                    .then(response => {
                        if (response.data.success) {
                            Swal.fire(
                                'Closed!',
                                'Invoice has been closed.',
                                'success'
                            );
                            // Refresh the page to show updated status
                            router.reload();
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

    return (
        <UserAuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <Link 
                            href={route('user.customers')}
                            className="text-indigo-600 hover:text-indigo-800 flex items-center space-x-2"
                        >
                            <FontAwesomeIcon icon={faArrowLeft} />
                            <span>Back to Customers</span>
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title={`Customer - ${customer.display_name}`} />

            <div className="container py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    
                    {/* Customer Information Card */}
                    <div className="bg-white shadow-sm sm:rounded-lg overflow-hidden">
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                                {/* Customer Info */}
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0 h-16 w-16">
                                        <div className="h-16 w-16 rounded-full bg-indigo-500 flex items-center justify-center">
                                            <span className="text-white text-xl font-semibold">
                                                {customer.first_name && customer.last_name 
                                                    ? `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`
                                                    : customer.email.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{customer.full_name}</h3>
                                        {customer.company && (
                                            <p className="text-lg text-gray-600">{customer.company}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                            <div className="flex items-center space-x-1">
                                                <FontAwesomeIcon icon={faEnvelope} />
                                                <span>{customer.email}</span>
                                            </div>
                                            {customer.phone_number && (
                                                <div className="flex items-center space-x-1">
                                                    <FontAwesomeIcon icon={faPhone} />
                                                    <span>{customer.phone_number}</span>
                                                </div>
                                            )}
                                            {customer.address && (
                                                <div className="flex items-center space-x-1">
                                                    <FontAwesomeIcon icon={faMapMarkerAlt} />
                                                    <span>{customer.address} {customer.address_2}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-1">
                                                <FontAwesomeIcon icon={faCalendarAlt} />
                                                <span>Customer since {formatDate(customer.created_at)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                                    <button
                                        onClick={openEditModal}
                                        className="px-4 py-2 bg-yellow-500 text-white rounded-md text-sm hover:bg-yellow-600 transition-all duration-300 flex items-center space-x-2"
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                        <span>Edit Customer</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                                    <p className="text-2xl font-semibold text-gray-900">{stats.total_invoices}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Total Billed</p>
                                    <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stats.total_amount)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-green-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Amount Paid</p>
                                    <p className="text-2xl font-semibold text-green-600">{formatCurrency(stats.paid_amount)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white shadow-sm sm:rounded-lg p-6">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                        <FontAwesomeIcon icon={faCalendarAlt} className="text-orange-600" />
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-500">Outstanding</p>
                                    <p className="text-2xl font-semibold text-orange-600">{formatCurrency(stats.outstanding_amount)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Creation Date */}
                    <div className="bg-white shadow-sm sm:rounded-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-lg font-medium text-gray-900">Account Information</h4>
                                <p className="text-sm text-gray-500">
                                    Customer since {formatDate(customer.created_at)}
                                    {stats.latest_invoice_date && (
                                        <span> • Last invoice: {formatDate(stats.latest_invoice_date)}</span>
                                    )}
                                </p>
                            </div>
                            <div className="flex space-x-4 text-sm">
                                <div className="text-center">
                                    <p className="font-medium text-green-600">{stats.status_counts.paid}</p>
                                    <p className="text-gray-500">Paid</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-yellow-600">{stats.status_counts.sent}</p>
                                    <p className="text-gray-500">Sent</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-orange-600">{stats.status_counts.overdue}</p>
                                    <p className="text-gray-500">Overdue</p>
                                </div>
                                <div className="text-center">
                                    <p className="font-medium text-red-600">{stats.status_counts.closed}</p>
                                    <p className="text-gray-500">Closed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Customer Invoices Section */}
                    <div className="bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                                <h3 className="text-lg font-medium text-gray-900">Customer Invoices</h3>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search invoices..."
                                            className="pl-10 pr-4 py-2 border rounded-md text-sm"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <FontAwesomeIcon 
                                            icon={faSearch} 
                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        />
                                    </div>
                                    <button
                                        onClick={openInvoiceTypeModal}
                                        className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition-all duration-300 flex items-center space-x-2"
                                    >
                                        <FontAwesomeIcon icon={faPlus} />
                                        <span>New Invoice</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
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
                                        <tr key={invoice.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link 
                                                    href={route('user.invoice.view', invoice.id)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
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
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {formatCurrency(invoice.total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(invoice.invoice_data.invoiceDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(invoice.invoice_data.invoiceDueDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={getStatusBadgeClass(invoice.status)}>
                                                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-3">
                                                    {/* View Invoice */}
                                                    <Link 
                                                        href={route('user.invoice.view', invoice.id)}
                                                        className="text-indigo-600 hover:text-indigo-900 relative group"
                                                        aria-label="View Invoice"
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            View
                                                        </span>
                                                    </Link>

                                                    {/* Download Invoice */}
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

                                                    {/* Edit Invoice */}
                                                    <button 
                                                        onClick={() => {
                                                            if (invoice.status === 'closed' || invoice.status === 'paid') return;
                                                            
                                                            const editRoute = invoice.invoice_type === 'real_estate'
                                                                ? route('user.real-estate-invoice.edit', invoice.id)
                                                                : route('user.general-invoice.edit', invoice.id);
                                                            router.get(editRoute);
                                                        }}
                                                        className={`${invoice.status === 'closed' || invoice.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-yellow-600 hover:text-yellow-900'} relative group`}
                                                        aria-label="Edit Invoice"
                                                        disabled={invoice.status === 'closed' || invoice.status === 'paid'}
                                                    >
                                                        <FontAwesomeIcon icon={faPenToSquare} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            {invoice.status === 'closed' || invoice.status === 'paid' ? 'Cannot Edit' : 'Edit'}
                                                        </span>
                                                    </button>

                                                    {/* Resend Invoice */}
                                                    <button 
                                                        onClick={() => handleResend(invoice)}
                                                        className={`${invoice.status === 'closed' || invoice.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-900'} relative group`}
                                                        aria-label="Resend Invoice"
                                                        disabled={invoice.status === 'closed' || invoice.status === 'paid'}
                                                    >
                                                        <FontAwesomeIcon icon={faPaperPlane} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            {invoice.status === 'closed' || invoice.status === 'paid' ? 'Cannot Resend' : 'Resend'}
                                                        </span>
                                                    </button>

                                                    {/* Close Invoice */}
                                                    <button 
                                                        onClick={() => handleClose(invoice)}
                                                        className={`${invoice.status === 'closed' || invoice.status === 'paid' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'} relative group`}
                                                        aria-label="Close Invoice"
                                                        disabled={invoice.status === 'closed' || invoice.status === 'paid'}
                                                    >
                                                        <FontAwesomeIcon icon={faX} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            {invoice.status === 'closed' || invoice.status === 'paid' ? 'Already Closed/Paid' : 'Close'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {displayedInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-sm text-gray-500">
                                                {searchTerm 
                                                    ? 'No invoices match your search.' 
                                                    : 'No invoices found for this customer.'}
                                                {!searchTerm && (
                                                    <div className="mt-4">
                                                        <button 
                                                            onClick={openInvoiceTypeModal} 
                                                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                                                        >
                                                            Create the first invoice for this customer
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="px-6 py-4 border-t border-gray-200">
                                <div className="flex justify-center items-center">
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
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* New Invoice Type Modal */}
            <Modal show={showInvoiceTypeModal} onClose={closeInvoiceTypeModal} maxWidth="md">
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Create New Invoice</h3>
                        <p className="text-sm text-gray-500 mt-1">Choose the type of invoice to create for {customer.full_name || customer.display_name}.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => navigateToInvoiceType('general')}
                            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 transition-all"
                        >
                            General Invoice
                        </button>
                        <button
                            onClick={() => navigateToInvoiceType('real_estate')}
                            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-all"
                        >
                            Real Estate Invoice
                        </button>
                    </div>
                    <div className="mt-4 text-right">
                        <button onClick={closeInvoiceTypeModal} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Customer Modal */}
            <Modal show={showEditModal} onClose={closeEditModal} maxWidth="2xl">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Edit Customer</h3>
                        <button
                            onClick={closeEditModal}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <FontAwesomeIcon icon={faTimes} />
                        </button>
                    </div>

                    <form onSubmit={handleEditCustomer} className="space-y-4">
                        {/* Personal Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="edit_first_name" value="First Name *" />
                                <TextInput
                                    id="edit_first_name"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={editData.first_name}
                                    onChange={(e) => setEditData('first_name', e.target.value)}
                                    required
                                />
                                <InputError message={editErrors.first_name} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_last_name" value="Last Name *" />
                                <TextInput
                                    id="edit_last_name"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={editData.last_name}
                                    onChange={(e) => setEditData('last_name', e.target.value)}
                                    required
                                />
                                <InputError message={editErrors.last_name} className="mt-2" />
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel htmlFor="edit_email" value="Email *" />
                                <TextInput
                                    id="edit_email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    value={editData.email}
                                    onChange={(e) => setEditData('email', e.target.value)}
                                    required
                                />
                                <InputError message={editErrors.email} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_phone_number" value="Phone Number" />
                                <TextInput
                                    id="edit_phone_number"
                                    type="tel"
                                    className="mt-1 block w-full"
                                    value={editData.phone_number}
                                    onChange={(e) => setEditData('phone_number', e.target.value)}
                                />
                                <InputError message={editErrors.phone_number} className="mt-2" />
                            </div>
                        </div>

                        {/* Company Information */}
                        <div>
                            <InputLabel htmlFor="edit_company" value="Company" />
                            <TextInput
                                id="edit_company"
                                type="text"
                                className="mt-1 block w-full"
                                value={editData.company}
                                onChange={(e) => setEditData('company', e.target.value)}
                            />
                            <InputError message={editErrors.company} className="mt-2" />
                        </div>

                        {/* Address Information */}
                        <div>
                            <InputLabel htmlFor="edit_address" value="Street Address" />
                            <TextInput
                                id="edit_address"
                                type="text"
                                className="mt-1 block w-full"
                                value={editData.address}
                                onChange={(e) => setEditData('address', e.target.value)}
                            />
                            <InputError message={editErrors.address} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_address2" value="Address Line 2" />
                            <TextInput
                                id="edit_address2"
                                type="text"
                                className="mt-1 block w-full"
                                value={editData.address2}
                                onChange={(e) => setEditData('address2', e.target.value)}
                            />
                            <InputError message={editErrors.address2} className="mt-2" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <InputLabel htmlFor="edit_city" value="City" />
                                <TextInput
                                    id="edit_city"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={editData.city}
                                    onChange={(e) => setEditData('city', e.target.value)}
                                />
                                <InputError message={editErrors.city} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_state" value="State" />
                                <select
                                    id="edit_state"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                    value={editData.state}
                                    onChange={(e) => setEditData('state', e.target.value)}
                                >
                                    <option value="">Select State</option>
                                    {statesList.map((state) => (
                                        <option key={state.value} value={state.value}>
                                            {state.text}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={editErrors.state} className="mt-2" />
                            </div>

                            <div>
                                <InputLabel htmlFor="edit_postal_code" value="Postal Code" />
                                <TextInput
                                    id="edit_postal_code"
                                    type="text"
                                    className="mt-1 block w-full"
                                    value={editData.postal_code}
                                    onChange={(e) => setEditData('postal_code', e.target.value)}
                                />
                                <InputError message={editErrors.postal_code} className="mt-2" />
                            </div>
                        </div>

                        <div>
                            <InputLabel htmlFor="edit_country" value="Country" />
                            <select
                                id="edit_country"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={editData.country}
                                onChange={(e) => setEditData('country', e.target.value)}
                            >
                                <option value="">Select Country</option>
                                {countryList.map((country) => (
                                    <option key={country.value} value={country.value}>
                                        {country.text}
                                    </option>
                                ))}
                            </select>
                            <InputError message={editErrors.country} className="mt-2" />
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end space-x-3 pt-4">
                            <SecondaryButton onClick={closeEditModal} type="button">
                                Cancel
                            </SecondaryButton>
                            <PrimaryButton disabled={editProcessing}>
                                {editProcessing ? 'Updating...' : 'Update Customer'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </UserAuthenticatedLayout>
    );
};

export default CustomerShow; 