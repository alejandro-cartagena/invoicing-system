import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function PaymentSuccess() {
    const [status, setStatus] = useState('processing');
    const [error, setError] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);

    // useEffect(() => {
    //     // Get payment status from URL parameters
    //     const params = new URLSearchParams(window.location.search);
    //     const trackingId = params.get('trackingId');
        
    //     console.log("URL Parameters:", Object.fromEntries(params.entries()));
    //     console.log("Tracking ID:", trackingId);

    //     if (trackingId) {
    //         // Verify payment status using the verify-bead-payment-status route
    //         axios.get('/verify-bead-payment-status', {
    //             params: {
    //                 trackingId: trackingId
    //             }
    //         })
    //         .then(response => {
    //             console.log("Payment Status Response:", response.data);
    //             if (response.data.success) {
    //                 setStatus('success');
    //                 setPaymentDetails(response.data.data);
    //             } else {
    //                 setStatus('failed');
    //                 setError(response.data.message);
    //             }
    //         })
    //         .catch(err => {
    //             console.error("Payment Status Error:", err);
    //             setStatus('failed');
    //             setError(err.response?.data?.message || 'Payment verification failed');
    //         });
    //     } else {
    //         console.log("No tracking ID found in URL parameters");
    //         setStatus('failed');
    //         setError('No tracking ID provided');
    //     }
    // }, []);

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <Head title="Payment Complete" />
            
            <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    {status === 'processing' && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                            <h2 className="text-xl font-bold mt-4 mb-2">Verifying Payment</h2>
                            <p className="text-gray-600">Please wait while we verify your payment...</p>
                        </div>
                    )}
                    
                    {status === 'success' && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-gray-800">Payment Successful!</h2>
                            <p className="text-gray-600 mb-6">Thank you for your payment.</p>
                        </div>
                    )}
                    
                    {status === 'failed' && (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2 text-gray-800">Payment Failed</h2>
                            <p className="text-red-600 mb-6">{error || "There was an issue with your payment."}</p>
                            
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 