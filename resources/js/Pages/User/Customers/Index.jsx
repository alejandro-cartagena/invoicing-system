import React, { useState, useEffect } from 'react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faSearch, 
    faChevronLeft, 
    faChevronRight, 
    faEye, 
    faEdit, 
    faTrash,
    faPlus,
    faTimes,
    faUser,
    faBuilding
} from '@fortawesome/free-solid-svg-icons';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import countryList from '@/data/countryList';
import statesList from '@/data/statesList';
import CustomerCreateModal from '@/Components/CustomerCreateModal';

const Customers = ({ customers: paginatedCustomers, search }) => {
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    
    // Use the customers prop directly instead of local state
    const customers = paginatedCustomers;

    // Form for editing customers
    const { 
        data: editData, 
        setData: setEditData, 
        patch, 
        processing: editProcessing, 
        errors: editErrors, 
        reset: resetEdit, 
        clearErrors: clearEditErrors 
    } = useForm({
        email: '',
        first_name: '',
        last_name: '',
        company: '',
        country: 'United States',
        state: '',
        address: '',
        address2: '',
        city: '',
        postal_code: '',
        phone_number: '',
    });

    // Handle search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== search) {
                router.get(route('user.customers'), 
                    searchTerm ? { search: searchTerm } : {}, 
                    { 
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                        only: ['customers']
                    }
                );
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);



    const handleDeleteCustomer = (customer) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete customer "${customer.email}". This action cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('user.customer.destroy', customer.id), {
                    onSuccess: () => {
                        Swal.fire(
                            'Deleted!',
                            'Customer has been deleted.',
                            'success'
                        );
                        // The backend redirects automatically, so no need to manually refresh
                    },
                    onError: (errors) => {
                        Swal.fire(
                            'Error!',
                            errors.message || 'Failed to delete customer.',
                            'error'
                        );
                    }
                });
            }
        });
    };



    const openEditModal = (customer) => {
        setEditingCustomer(customer);
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
        setEditingCustomer(null);
        resetEdit();
        clearEditErrors();
    };

    const handleEditCustomer = (e) => {
        e.preventDefault();
        
        patch(route('user.customer.update', editingCustomer.id), {
            onStart: () => {
                // Close modal and reset form immediately when the request starts
                resetEdit();
                setShowEditModal(false);
                setEditingCustomer(null);
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
        return date.toLocaleDateString("en-US", { year: "2-digit", month: "2-digit", day: "2-digit" });
    };

    return (
        <UserAuthenticatedLayout
            header={
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Your Customers
                    </h2>
                </div>
            }
        >
            <Head title="Customers" />

            <div className="container py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    {/* Search and Create Controls */}
                    <div className="mb-6">
                        <div className="flex flex-col md:flex-row justify-between items-start space-y-4 md:space-y-0 md:items-center">
                            <div className="w-full md:w-auto">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search customers..."
                                        className="w-full md:w-[300px] p-2 pl-10 border rounded"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                    <FontAwesomeIcon 
                                        icon={faSearch} 
                                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                    />
                                </div>
                                <p className="mt-2 text-sm text-gray-500">
                                    Search by name, email, or company
                                </p>
                            </div>
                            
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-indigo-500 text-white rounded-md text-sm hover:bg-indigo-600 transition-all duration-300 flex items-center space-x-2"
                            >
                                <FontAwesomeIcon icon={faPlus} />
                                <span>Create New Customer</span>
                            </button>
                        </div>
                    </div>

                    {/* Customers Table */}
                    <div className="bg-white xl:overflow-x-visible xl:whitespace-normal overflow-x-auto whitespace-nowrap shadow-sm sm:rounded-lg">
                        <div className="bg-white border-b border-gray-200">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Customer
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Company
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Phone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Location
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Invoices
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {customers.data.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                                                            <FontAwesomeIcon icon={customer.company ? faBuilding : faUser} className="text-white text-sm" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {customer.full_name}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {customer.company || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {customer.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {customer.phone_number || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {customer.city && customer.state 
                                                        ? `${customer.city}, ${customer.state}` 
                                                        : customer.city || customer.state || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {customer.invoices_count || 0} invoices
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {formatDate(customer.created_at)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-3">
                                                    {/* View Customer */}
                                                    <Link 
                                                        href={route('user.customer.view', customer.id)}
                                                        className="text-indigo-600 hover:text-indigo-900 relative group"
                                                        aria-label="View Customer"
                                                    >
                                                        <FontAwesomeIcon icon={faEye} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            View
                                                        </span>
                                                    </Link>

                                                    {/* Edit Customer */}
                                                    <button 
                                                        onClick={() => openEditModal(customer)}
                                                        className="text-yellow-600 hover:text-yellow-900 relative group"
                                                        aria-label="Edit Customer"
                                                    >
                                                        <FontAwesomeIcon icon={faEdit} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            Edit
                                                        </span>
                                                    </button>

                                                    {/* Delete Customer */}
                                                    <button 
                                                        onClick={() => handleDeleteCustomer(customer)}
                                                        className="text-red-600 hover:text-red-900 relative group"
                                                        aria-label="Delete Customer"
                                                    >
                                                        <FontAwesomeIcon icon={faTrash} />
                                                        <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                                            Delete
                                                        </span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {customers.data.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                                                {searchTerm 
                                                    ? 'No customers match your search.' 
                                                    : 'No customers found. Create your first customer to get started!'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Pagination Controls */}
                    {customers.last_page > 1 && (
                        <div className="mt-4 flex justify-center items-center">
                            <div className="flex space-x-2">
                                {customers.prev_page_url && (
                                    <Link
                                        href={customers.prev_page_url}
                                        className="px-3 py-1 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        preserveState
                                        preserveScroll
                                    >
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </Link>
                                )}
                                
                                {Array.from({ length: customers.last_page }, (_, i) => i + 1).map((page) => (
                                    <Link
                                        key={page}
                                        href={customers.path + '?page=' + page + (searchTerm ? '&search=' + searchTerm : '')}
                                        className={`px-3 py-1 rounded ${
                                            customers.current_page === page
                                                ? "bg-gray-800 text-white"
                                                : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        }`}
                                        preserveState
                                        preserveScroll
                                    >
                                        {page}
                                    </Link>
                                ))}
                                
                                {customers.next_page_url && (
                                    <Link
                                        href={customers.next_page_url}
                                        className="px-3 py-1 rounded bg-gray-300 text-gray-700 hover:bg-gray-400"
                                        preserveState
                                        preserveScroll
                                    >
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Customer Modal */}
            <CustomerCreateModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
            />

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

export default Customers;
