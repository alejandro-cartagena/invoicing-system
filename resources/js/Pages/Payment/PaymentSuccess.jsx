import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function PaymentSuccess() {
    const [status, setStatus] = useState('processing');
    const [error, setError] = useState(null);
    const [paymentDetails, setPaymentDetails] = useState(null);

    useEffect(() => {
        // Get payment status from URL parameters
        const params = new URLSearchParams(window.location.search);
        const trackingId = params.get('trackingId');
        const paymentStatus = params.get('status');

        if (trackingId) {
            // You could verify the payment status with your backend
            axios.post('/api/verify-payment', {
                trackingId,
                status: paymentStatus
            })
            .then(response => {
                if (response.data.success) {
                    setStatus('success');
                    setPaymentDetails(response.data.payment);
                } else {
                    setStatus('failed');
                    setError(response.data.message);
                }
            })
            .catch(err => {
                setStatus('failed');
                setError(err.response?.data?.message || 'Payment verification failed');
            });
        } else {
            // Handle case where no tracking ID is provided
            setStatus('success'); // Assume success for now if no tracking ID
        }
    }, []);

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
                            
                            <div className="mt-8">
                                <a 
                                    href="/invoices" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
                                >
                                    Return to Invoices
                                </a>
                            </div>
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
                            
                            <div className="mt-8">
                                <a 
                                    href="/invoices" 
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
                                >
                                    Return to Invoices
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 