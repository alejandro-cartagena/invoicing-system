import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const CreditCardForm = ({ invoiceId, amount, onSuccess, onError, nmiInvoiceId }) => {
    const [loading, setLoading] = useState(false);
    const [firstName, setFirstName] = useState('John');
    const [lastName, setLastName] = useState('Doe');
    const [address, setAddress] = useState('123 Main St');
    const [city, setCity] = useState('Anytown');
    const [state, setState] = useState('CA');
    const [zip, setZip] = useState('12345');
    const [phone, setPhone] = useState('555-123-4567');
    const [collectJsLoaded, setCollectJsLoaded] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const validationTimeoutRef = useRef(null);
    const allFieldsValidRef = useRef({
        ccnumber: false,
        ccexp: false,
        cvv: false
    });

    useEffect(() => {
        console.log('CreditCardForm component mounted');
        
        // Load Collect.js script
        const script = document.createElement('script');
        script.src = 'https://dvfsolutions.transactiongateway.com/token/Collect.js';
        script.setAttribute('data-tokenization-key', '99mHPB-PkyqE3-5ZsRdN-3S4H5e'); // Your public key
        script.setAttribute('data-variant', 'lightbox');
        
        document.body.appendChild(script);

        // Configure Collect.js
        script.onload = () => {
            console.log('Collect.js script loaded');
            setCollectJsLoaded(true);
            
            if (window.CollectJS) {
                console.log('CollectJS object is available');
                
                window.CollectJS.configure({
                    variant: 'lightbox',
                    callback: (response) => {
                        console.log('CollectJS callback received', response);
                        setIsSubmitting(false);
                        // Handle the payment token
                        handlePaymentToken(response.token);
                    },
                    timeoutDuration: 10000, // Reduced timeout for better UX
                    timeoutCallback: () => {
                        console.log('Timeout reached');
                        setIsSubmitting(false);
                        onError('Payment processing timed out. Please try again.');
                    }
                });
            } else {
                console.error('CollectJS object not found after script load');
            }
        };

        script.onerror = (error) => {
            console.error('Error loading Collect.js script:', error);
            onError('Failed to load payment processing script. Please try again later.');
        };

        return () => {
            // Clean up
            console.log('Cleaning up Collect.js script');
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
            
            // Clear any pending timeouts
            if (validationTimeoutRef.current) {
                clearTimeout(validationTimeoutRef.current);
            }
        };
    }, []);

    // Inside the component, add this function to help with debugging
    const debugCollectJSToken = (token) => {
        console.log('Received token from CollectJS:', token);
        
        // Check if it's one of the test tokens
        if (token === '00000000-000000-000000-000000000000') {
            console.log('This is the test token for Visa card 4111111111111111');
        } else if (token === '11111111-111111-111111-111111111111') {
            console.log('This is the test token for ACH account');
        } else {
            console.log('This appears to be a real token generated by CollectJS');
        }
    };

    // Modify the handlePaymentToken function
    const handlePaymentToken = async (token) => {
        console.log('Processing payment with token:', token);
        debugCollectJSToken(token);
        setLoading(true);
        
        try {
            // Double-check that all fields are filled out
            if (!firstName.trim() || !lastName.trim() || !address.trim() || 
                !city.trim() || !state.trim() || !zip.trim() || !phone.trim()) {
                
                const missingFields = [];
                if (!firstName.trim()) missingFields.push('First Name');
                if (!lastName.trim()) missingFields.push('Last Name');
                if (!address.trim()) missingFields.push('Address');
                if (!city.trim()) missingFields.push('City');
                if (!state.trim()) missingFields.push('State');
                if (!zip.trim()) missingFields.push('ZIP');
                if (!phone.trim()) missingFields.push('Phone');
                
                const errorMessage = `Please fill in all required fields: ${missingFields.join(', ')}`;
                console.error(errorMessage);
                onError(errorMessage);
                setLoading(false);
                setIsSubmitting(false);
                return;
            }
            
            // Make sure all fields are properly trimmed and not empty
            const requestData = {
                token: token,
                invoiceId: invoiceId,
                amount: amount,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                address: address.trim(),
                city: city.trim(),
                state: state.trim(),
                zip: zip.trim(),
                phone: phone.trim(),
                nmiInvoiceId: nmiInvoiceId
            };
            
            console.log('Sending payment request to server with data:', requestData);
            
            try {
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
            } catch (axiosError) {
                console.error('Axios error details:', {
                    status: axiosError.response?.status,
                    statusText: axiosError.response?.statusText,
                    data: axiosError.response?.data,
                    message: axiosError.message
                });
                
                // Show more detailed error message
                const errorMessage = axiosError.response?.data?.message || 
                                    axiosError.response?.statusText || 
                                    axiosError.message || 
                                    'An error occurred while processing your payment';
                
                onError(errorMessage);
            }
        } catch (error) {
            console.error('Payment error:', error);
            onError('An unexpected error occurred while processing your payment');
        } finally {
            setLoading(false);
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Form submitted manually');
        
        // Validate form fields with detailed logging
        const missingFields = [];
        
        if (!firstName.trim()) missingFields.push('First Name');
        if (!lastName.trim()) missingFields.push('Last Name');
        if (!address.trim()) missingFields.push('Address');
        if (!city.trim()) missingFields.push('City');
        if (!state.trim()) missingFields.push('State');
        if (!zip.trim()) missingFields.push('ZIP');
        if (!phone.trim()) missingFields.push('Phone');
        
        // Log current field values for debugging
        console.log('Current form values:', {
            firstName: firstName,
            lastName: lastName,
            address: address,
            city: city,
            state: state,
            zip: zip,
            phone: phone
        });
        
        if (missingFields.length > 0) {
            console.error('Missing required fields:', missingFields);
            Swal.fire({
                title: 'Missing Information',
                text: `Please fill in the following required fields: ${missingFields.join(', ')}`,
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            return;
        }
        
        setIsSubmitting(true);
        
        // Trigger CollectJS payment submission
        if (window.CollectJS) {
            console.log('Triggering CollectJS.startPaymentRequest()');
            
            // Set a timeout to check if validation is taking too long
            validationTimeoutRef.current = setTimeout(() => {
                // If we're still submitting after 3 seconds, something might be wrong
                if (isSubmitting) {
                    console.log('Validation taking too long, checking field status');
                    
                    // Check if any fields are invalid
                    const hasInvalidFields = Object.values(validationErrors).some(error => error !== null);
                    
                    if (hasInvalidFields) {
                        setIsSubmitting(false);
                        
                        // Collect all validation errors
                        const errorMessages = [];
                        if (validationErrors.ccnumber) errorMessages.push(`Card Number: ${validationErrors.ccnumber}`);
                        if (validationErrors.ccexp) errorMessages.push(`Expiration Date: ${validationErrors.ccexp}`);
                        if (validationErrors.cvv) errorMessages.push(`CVV: ${validationErrors.cvv}`);
                        
                        const errorMessage = errorMessages.length > 0 
                            ? errorMessages.join('\n') 
                            : 'Please check your card information and try again.';
                        
                        Swal.fire({
                            title: 'Validation Error',
                            text: errorMessage,
                            icon: 'error',
                            confirmButtonText: 'Try Again'
                        });
                    }
                }
            }, 3000);
            
            window.CollectJS.startPaymentRequest();
        } else {
            console.error('CollectJS not available for payment submission');
            onError('Payment system not initialized. Please refresh the page and try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Payment Information</h2>
            
            {!collectJsLoaded && (
                <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
                    Loading payment form...
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-gray-700 mb-2">First Name</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded" 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-gray-700 mb-2">Last Name</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded" 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                    />
                </div>
            </div>
            
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Address</label>
                <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded" 
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                />
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                    <label className="block text-gray-700 mb-2">City</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded" 
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-gray-700 mb-2">State</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded" 
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-gray-700 mb-2">ZIP</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border border-gray-300 rounded" 
                        value={zip}
                        onChange={(e) => setZip(e.target.value)}
                        required
                    />
                </div>
            </div>
            
            <div className="mb-4">
                <label className="block text-gray-700 mb-2">Phone</label>
                <input 
                    type="tel" 
                    className="w-full p-2 border border-gray-300 rounded" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                />
            </div>
            
            <button 
                id="payButton"
                type="submit"
                className={`w-full py-2 px-4 rounded transition-colors text-white ${
                    isSubmitting || loading || !collectJsLoaded
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={isSubmitting || loading || !collectJsLoaded}
            >
                {isSubmitting ? (
                    <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                    </div>
                ) : loading ? (
                    'Completing Payment...'
                ) : (
                    `Pay $${parseFloat(amount).toFixed(2)}`
                )}
            </button>
            
            <div className="mt-4 text-xs text-gray-500">
                <p>This payment form is secured with SSL encryption.</p>
                <p>For testing, use card number: 4111 1111 1111 1111, expiration: 10/25, and CVV: 999</p>
                <p className="mt-2 font-medium">Note: This is a test payment and no actual charges will be made.</p>
            </div>
        </form>
    );
};

export default CreditCardForm;
