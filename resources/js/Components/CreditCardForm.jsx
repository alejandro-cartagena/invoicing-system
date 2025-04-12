import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import statesList from '@/data/statesList';

const CreditCardForm = ({ amount, onSuccess, onError, invoiceId }) => {
    // Form data state
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: ''
    });
    
    // Form status states
    const [loading, setLoading] = useState(false);
    const [collectJsLoaded, setCollectJsLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [touched, setTouched] = useState({
        firstName: false,
        lastName: false,
        address: false,
        city: false,
        state: false,
        zip: false,
        phone: false
    });
    
    // Refs
    const formRef = useRef(null);
    const formDataRef = useRef({});

    // Validation function for form fields
    const validateField = (name, value) => {
        let error = '';
        
        switch (name) {
            case 'firstName':
            case 'lastName':
                if (!value.trim()) {
                    error = `${name === 'firstName' ? 'First' : 'Last'} name is required`;
                }
                break;
            case 'address':
                if (!value.trim()) {
                    error = 'Address is required';
                }
                break;
            case 'city':
                if (!value.trim()) {
                    error = 'City is required';
                }
                break;
            case 'state':
                if (!value) {
                    error = 'State is required';
                }
                break;
            case 'zip':
                if (!value.trim()) {
                    error = 'ZIP code is required';
                } else if (!/^\d{5}(-\d{4})?$/.test(value.trim())) {
                    error = 'ZIP code must be in format 12345 or 12345-6789';
                }
                break;
            case 'phone':
                if (!value.trim()) {
                    error = 'Phone number is required';
                } else {
                    // More lenient phone validation - just make sure it has at least 10 digits
                    const digitsOnly = value.replace(/\D/g, '');
                    if (digitsOnly.length < 10) {
                        error = 'Please enter a valid phone number with at least 10 digits';
                    }
                }
                break;
            default:
                break;
        }
        
        return error;
    };

    // Handle field changes with validation
    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Update the formData state
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        // Mark field as touched
        setTouched(prev => ({ ...prev, [name]: true }));
        
        // Validate field
        const error = validateField(name, value);
        setValidationErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    console.log(formData);

    // Handle field blur for validation
    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, value);
        setValidationErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    // Check if all form fields are valid
    const areAllFieldsValid = () => {
        const errors = {};
        let isValid = true;
        
        // Validate all fields
        Object.keys(formData).forEach(field => {
            const error = validateField(field, formData[field]);
            if (error) {
                errors[field] = error;
                isValid = false;
            }
        });
        
        // Update validation errors state
        setValidationErrors(errors);
        
        // Update touched state for all fields
        setTouched({
            firstName: true,
            lastName: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            phone: true
        });
        
        return isValid;
    };

    useEffect(() => {
        // Load Collect.js script
        const script = document.createElement('script');
        script.src = 'https://dvfsolutions.transactiongateway.com/token/Collect.js';
        script.setAttribute('data-tokenization-key', '99mHPB-PkyqE3-5ZsRdN-3S4H5e');
        script.setAttribute('data-variant', 'lightbox');
        
        document.body.appendChild(script);

        // Configure Collect.js
        script.onload = () => {
            console.log('Collect.js script loaded');
            setCollectJsLoaded(true);
            
            if (window.CollectJS) {
                window.CollectJS.configure({
                    variant: 'lightbox',
                    callback: (response) => {
                        setIsSubmitting(false);
                        
                        // Use the data from the ref instead of the formData state
                        // No need to create a new currentFormData here anymore
                        const currentFormData = formDataRef.current;
                        console.log('Using form data from ref:', currentFormData);
                        
                        handlePaymentToken(response.token, currentFormData);
                    },
                    timeoutDuration: 10000,
                    timeoutCallback: () => {
                        setIsSubmitting(false);
                        onError('Payment processing timed out. Please try again.');
                    }
                });
            }
        };

        script.onerror = (error) => {
            onError('Failed to load payment processing script. Please try again later.');
        };

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Handle payment token submission
    const handlePaymentToken = async (token, currentFormData) => {
        console.log('Processing payment with token:', token);
        console.log('Using form data:', currentFormData);
        setLoading(true);
        
        try {
            const requestData = {
                token: token,
                invoiceId: invoiceId,
                amount: amount,
                firstName: currentFormData.firstName.trim(),
                lastName: currentFormData.lastName.trim(),
                address: currentFormData.address.trim(),
                city: currentFormData.city.trim(),
                state: currentFormData.state,
                zip: currentFormData.zip.trim(),
                phone: currentFormData.phone.trim()
            };
            
            console.log('Sending payment request with data:', requestData);
            
            const response = await axios.post(route('general-invoice.process.credit-card'), requestData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            console.log('Payment response:', response.data);
            
            if (response.data.success) {
                onSuccess(response.data);
            } else {
                onError(response.data.message || 'Payment processing failed');
            }
        } catch (error) {
            console.error('Payment error:', error);
            onError(error.response?.data?.message || 'An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (isSubmitting) {
            return;
        }
        
        if (!areAllFieldsValid()) {
            Swal.fire({
                title: 'Form Validation Error',
                text: 'Please fill in all required fields correctly.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        // Store current form data in ref BEFORE starting payment request
        formDataRef.current = {...formData};
        console.log('Storing current form data:', formDataRef.current);
        
        setIsSubmitting(true);
        
        if (collectJsLoaded && window.CollectJS) {
            window.CollectJS.startPaymentRequest();
        } else {
            setIsSubmitting(false);
            onError('Payment system is not ready. Please try again later.');
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Billing Information</h2>
            
            <form ref={formRef} onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                            First Name *
                        </label>
                        <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full p-2 border rounded-md ${
                                touched.firstName && validationErrors.firstName 
                                    ? 'border-red-500' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="John"
                            disabled={isSubmitting || loading}
                        />
                        {touched.firstName && validationErrors.firstName && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name *
                        </label>
                        <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full p-2 border rounded-md ${
                                touched.lastName && validationErrors.lastName 
                                    ? 'border-red-500' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="Doe"
                            disabled={isSubmitting || loading}
                        />
                        {touched.lastName && validationErrors.lastName && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                        )}
                    </div>
                </div>
                
                <div className="mb-4">
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                    </label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full p-2 border rounded-md ${
                            touched.address && validationErrors.address 
                                ? 'border-red-500' 
                                : 'border-gray-300'
                        }`}
                        placeholder="123 Main St"
                        disabled={isSubmitting || loading}
                    />
                    {touched.address && validationErrors.address && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.address}</p>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                            City *
                        </label>
                        <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full p-2 border rounded-md ${
                                touched.city && validationErrors.city 
                                    ? 'border-red-500' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="New York"
                            disabled={isSubmitting || loading}
                        />
                        {touched.city && validationErrors.city && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.city}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                            State *
                        </label>
                        <select
                            id="state"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full p-2 border rounded-md ${
                                touched.state && validationErrors.state 
                                    ? 'border-red-500' 
                                    : 'border-gray-300'
                            }`}
                            disabled={isSubmitting || loading}
                        >
                            <option value="">Select a state</option>
                            {statesList.map(state => (
                                <option key={state.value} value={state.value}>
                                    {state.text}
                                </option>
                            ))}
                        </select>
                        {touched.state && validationErrors.state && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.state}</p>
                        )}
                    </div>
                    
                    <div>
                        <label htmlFor="zip" className="block text-sm font-medium text-gray-700 mb-1">
                            ZIP Code *
                        </label>
                        <input
                            type="text"
                            id="zip"
                            name="zip"
                            value={formData.zip}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            className={`w-full p-2 border rounded-md ${
                                touched.zip && validationErrors.zip 
                                    ? 'border-red-500' 
                                    : 'border-gray-300'
                            }`}
                            placeholder="12345"
                            disabled={isSubmitting || loading}
                        />
                        {touched.zip && validationErrors.zip && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.zip}</p>
                        )}
                    </div>
                </div>
                
                <div className="mb-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                    </label>
                    <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full p-2 border rounded-md ${
                            touched.phone && validationErrors.phone 
                                ? 'border-red-500' 
                                : 'border-gray-300'
                        }`}
                        placeholder="(123) 456-7890"
                        disabled={isSubmitting || loading}
                    />
                    {touched.phone && validationErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.phone}</p>
                    )}
                </div>
                
                <div className="mb-6">
                    <h3 className="text-lg font-medium mb-2">Payment Information</h3>
                    <p className="text-sm text-gray-600 mb-2">
                        After clicking "Pay Now", you'll be prompted to enter your credit card information securely.
                    </p>
                </div>
                
                <div className="border-t pt-4">
                    <button
                        type="submit"
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                            (isSubmitting || loading) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={isSubmitting || loading}
                    >
                        {isSubmitting || loading ? (
                            <span>Processing...</span>
                        ) : (
                            <span>Pay ${parseFloat(amount).toFixed(2)} Now</span>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreditCardForm;
