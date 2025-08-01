import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faSearch, faTimes, faPlus } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';

const CustomerSelector = ({ 
    selectedCustomer, 
    onCustomerSelect, 
    onEmailChange, 
    email, 
    disabled = false,
    placeholder = "Search customers or enter email...",
    onCustomerDataFill = null
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [customers, setCustomers] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [useManualEmail, setUseManualEmail] = useState(false);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Search customers when searchTerm changes
    useEffect(() => {
        const searchCustomers = async () => {
            if (searchTerm.length < 2) {
                setCustomers([]);
                return;
            }

            setLoading(true);
            try {
                const response = await axios.get(route('api.customers'), {
                    params: { search: searchTerm }
                });
                setCustomers(response.data);
            } catch (error) {
                console.error('Error searching customers:', error);
                setCustomers([]);
            } finally {
                setLoading(false);
            }
        };

        const debounceTimer = setTimeout(searchCustomers, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        
        if (useManualEmail) {
            onEmailChange(value);
        }
        
        if (!showDropdown && value.length > 0) {
            setShowDropdown(true);
        }
    };

    const handleCustomerSelect = (customer) => {
        console.log('CustomerSelector: Customer selected:', customer);
        onCustomerSelect(customer);
        onEmailChange(customer.email);
        setSearchTerm(customer.name);
        setShowDropdown(false);
        setUseManualEmail(false);
        
        // Call the auto-fill callback if provided
        if (onCustomerDataFill && customer.full_data) {
            console.log('CustomerSelector: Calling onCustomerDataFill with:', customer.full_data);
            onCustomerDataFill(customer.full_data);
        } else {
            console.log('CustomerSelector: No onCustomerDataFill callback or no full_data');
        }
    };

    const handleManualEmailToggle = () => {
        setUseManualEmail(true);
        onCustomerSelect(null);
        setSearchTerm(email || '');
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    const clearSelection = () => {
        onCustomerSelect(null);
        onEmailChange('');
        setSearchTerm('');
        setUseManualEmail(false);
        setShowDropdown(false);
    };

    const isValidEmail = (email) => {
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return emailRegex.test(email);
    };

    const getDisplayValue = () => {
        if (selectedCustomer && !useManualEmail) {
            return selectedCustomer.email;
        }
        return searchTerm;
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={getDisplayValue()}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (!useManualEmail && !selectedCustomer) {
                            setShowDropdown(true);
                        }
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                />
                
                {/* Search icon */}
                <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                
                {/* Clear button */}
                {(selectedCustomer || searchTerm) && (
                    <button
                        type="button"
                        onClick={clearSelection}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                )}
            </div>

            {/* Selected customer info */}
            {selectedCustomer && !useManualEmail && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FontAwesomeIcon icon={faUser} className="text-blue-600" />
                        <div>
                            <p className="text-sm font-medium text-blue-900">{selectedCustomer.name}</p>
                            <p className="text-xs text-blue-600">{selectedCustomer.email}</p>
                        </div>
                    </div>
                    
                </div>
            )}

            {/* Manual email validation */}
            {useManualEmail && searchTerm && !isValidEmail(searchTerm) && (
                <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
            )}

            {/* Dropdown */}
            {showDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {loading && (
                        <div className="p-3 text-center text-gray-500">
                            <FontAwesomeIcon icon={faSearch} className="animate-spin mr-2" />
                            Searching...
                        </div>
                    )}
                    
                    {!loading && customers.length === 0 && searchTerm.length >= 2 && (
                        <div className="p-3">
                            <p className="text-gray-500 text-sm mb-2">No customers found</p>
                            <div className="space-y-2">
                                {isValidEmail(searchTerm) ? (
                                    <button
                                        onClick={() => {
                                            setUseManualEmail(true);
                                            onEmailChange(searchTerm);
                                            setShowDropdown(false);
                                        }}
                                        className="w-full text-left p-2 text-indigo-600 hover:bg-indigo-50 rounded text-sm flex items-center"
                                    >
                                        <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                        Use "{searchTerm}" as email
                                    </button>
                                ) : (
                                    <p className="text-xs text-gray-400">
                                        Enter a valid email or search for existing customers
                                    </p>
                                )}
                                <a
                                    href={route('user.customer.create')}
                                    className="w-full text-left p-2 text-green-600 hover:bg-green-50 rounded text-sm flex items-center border-t pt-2"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Create new customer
                                </a>
                            </div>
                        </div>
                    )}
                    
                    {!loading && customers.length > 0 && (
                        <>
                            {customers.map((customer) => (
                                <button
                                    key={customer.id}
                                    onClick={() => handleCustomerSelect(customer)}
                                    className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex items-center space-x-3">
                                        <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-900">{customer.name}</p>
                                            <p className="text-sm text-gray-500">{customer.email}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            
                            {/* Manual email option at bottom */}
                            {isValidEmail(searchTerm) && (
                                <button
                                    onClick={() => {
                                        setUseManualEmail(true);
                                        onEmailChange(searchTerm);
                                        setShowDropdown(false);
                                    }}
                                    className="w-full text-left p-3 border-t border-gray-200 text-indigo-600 hover:bg-indigo-50 flex items-center"
                                >
                                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                    Use "{searchTerm}" as new email
                                </button>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerSelector; 