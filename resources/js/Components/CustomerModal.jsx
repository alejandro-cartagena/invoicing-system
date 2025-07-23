import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faTimes, 
    faSearch, 
    faUser, 
    faBuilding, 
    faEnvelope, 
    faPhone, 
    faMapMarkerAlt,
    faChevronLeft,
    faChevronRight,
    faPlus
} from '@fortawesome/free-solid-svg-icons';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import CustomerCreateModal from '@/Components/CustomerCreateModal';
import axios from 'axios';

const CustomerModal = ({ show, onClose, onSelectCustomer, selectedCustomerId = null }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const customersPerPage = 10;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (show) {
            setCurrentPage(1);
            setSearchTerm('');
            fetchCustomers();
        }
    }, [show]);

    // Fetch customers when search term or page changes
    useEffect(() => {
        if (show) {
            const debounceTimer = setTimeout(() => {
                setCurrentPage(1); // Reset to first page when searching
                fetchCustomers();
            }, 300);
            return () => clearTimeout(debounceTimer);
        }
    }, [searchTerm]);

    useEffect(() => {
        if (show) {
            fetchCustomers();
        }
    }, [currentPage]);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await axios.get(route('api.customers'), {
                params: { 
                    search: searchTerm,
                    page: currentPage,
                    per_page: customersPerPage 
                }
            });

            // Handle Laravel pagination response
            const paginationData = response.data;
            setCustomers(paginationData.data || []);
            setTotalCustomers(paginationData.total || 0);
        } catch (error) {
            console.error('Error fetching customers:', error);
            setCustomers([]);
            setTotalCustomers(0);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCustomers / customersPerPage);

    const handlePageChange = (newPage) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSelectCustomer = (customer) => {
        onSelectCustomer(customer);
        onClose();
    };

    const handleCreateCustomer = () => {
        setShowCreateModal(true);
    };

    const handleCustomerCreated = (newCustomer) => {
        // Add the new customer to the current list
        setCustomers(prevCustomers => [newCustomer, ...prevCustomers]);
        setTotalCustomers(prev => prev + 1);
        
        // Optionally, automatically select the new customer
        handleSelectCustomer(newCustomer);
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Select Customer</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search customers by name, email, or company..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <FontAwesomeIcon 
                            icon={faSearch} 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                    </div>
                </div>

                {/* Create Customer Button */}
                <div className="mb-4">
                    <SecondaryButton
                        onClick={handleCreateCustomer}
                        className="flex items-center space-x-2"
                    >
                        <FontAwesomeIcon icon={faPlus} />
                        <span>Create New Customer</span>
                    </SecondaryButton>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <span className="ml-3 text-gray-600">Loading customers...</span>
                    </div>
                )}

                {/* Customer List */}
                {!loading && (
                    <div className="space-y-3 mb-6" style={{ minHeight: '400px' }}>
                        {customers.length === 0 ? (
                            <div className="text-center py-12">
                                <FontAwesomeIcon icon={faUser} className="text-gray-300 text-4xl mb-4" />
                                <p className="text-gray-500 text-lg">
                                    {searchTerm ? 'No customers found matching your search.' : 'No customers found.'}
                                </p>
                                <p className="text-gray-400 text-sm mt-2">
                                    Create your first customer to get started.
                                </p>
                            </div>
                        ) : (
                            customers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                        selectedCustomerId === customer.id
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => handleSelectCustomer(customer)}
                                >
                                    <div className="flex items-start space-x-4">
                                        {/* Avatar */}
                                        <div className="flex-shrink-0">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                                                customer.full_data?.company 
                                                    ? 'bg-blue-100 text-blue-600' 
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                                <FontAwesomeIcon 
                                                    icon={customer.full_data?.company ? faBuilding : faUser} 
                                                />
                                            </div>
                                        </div>

                                        {/* Customer Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-lg font-medium text-gray-900 truncate">
                                                        {customer.name}
                                                    </h4>
                                                    {customer.full_data?.company && (
                                                        <p className="text-sm text-gray-600 mb-1">
                                                            {customer.full_data.company}
                                                        </p>
                                                    )}
                                                </div>
                                                {selectedCustomerId === customer.id && (
                                                    <div className="ml-2">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                                            Selected
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <FontAwesomeIcon icon={faEnvelope} className="w-4 mr-2" />
                                                    <span className="truncate">{customer.email}</span>
                                                </div>

                                                {customer.full_data?.phone_number && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FontAwesomeIcon icon={faPhone} className="w-4 mr-2" />
                                                        <span>{customer.full_data.phone_number}</span>
                                                    </div>
                                                )}

                                                {customer.full_data?.full_address && (
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 mr-2" />
                                                        <span className="truncate">{customer.full_data.full_address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between border-t pt-4">
                        <div className="text-sm text-gray-700">
                            Showing {((currentPage - 1) * customersPerPage) + 1} to {Math.min(currentPage * customersPerPage, totalCustomers)} of {totalCustomers} customers
                        </div>
                        
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <FontAwesomeIcon icon={faChevronLeft} />
                            </button>

                            {/* Page Numbers */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum)}
                                        className={`px-3 py-2 rounded-md text-sm font-medium ${
                                            currentPage === pageNum
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className={`px-3 py-2 rounded-md text-sm font-medium ${
                                    currentPage === totalPages
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                            >
                                <FontAwesomeIcon icon={faChevronRight} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                    <SecondaryButton onClick={onClose}>
                        Cancel
                    </SecondaryButton>
                </div>
            </div>

            {/* Customer Create Modal */}
            <CustomerCreateModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCustomerCreated={handleCustomerCreated}
            />
        </Modal>
    );
};

export default CustomerModal; 