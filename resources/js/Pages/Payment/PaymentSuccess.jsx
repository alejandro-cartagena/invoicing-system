import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function PaymentSuccess() {
    const [beadPaymentResponse, setBeadPaymentResponse] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState(null);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const reference = searchParams.get('reference'); 

        if (!reference) {
        setStatus('Missing reference');
        setLoading(false);
        return;
        }

        // Step 1: Fetch invoice using your existing route
        axios.get(`/invoice/nmi/${reference}`)
        .then((res) => {
            const invoice = res.data.invoice;
            setInvoice(invoice);
            const trackingId = invoice.bead_payment_id;

            // Step 2: Use trackingId to check payment status
            return axios.post('/api/verify-payment', {
                trackingId: trackingId
            });
        })
        .then((res) => {
            console.log("res", res);
            setBeadPaymentResponse(res.data);
            setStatus(res.data.payment.status_code);
            setLoading(false);
        })
        .catch((err) => {
            console.error(err);
            setBeadPaymentResponse('Error verifying payment');
            setLoading(false);
        });
    }, []);

    console.log("status", status);


    

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
                    
                    {status === 'completed' && (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold mb-4 text-gray-800">Payment Successful!</h2>
                            <p className="text-gray-700 text-lg mb-4">
                                    Thank you for your payment of{' '}
                                    <span className="font-bold text-green-600">
                                        ${beadPaymentResponse.payment.amounts.paid.inPaymentCurrency.amount}
                                    </span>
                                </p>
                            <div className="max-w-md mx-auto bg-green-50 rounded-lg p-6 shadow-sm">
                                
                                <div className="space-y-3 text-sm">
                                    <div className="flex md:flex-row flex-col justify-between items-center border-b border-green-100 pb-2">
                                        <span className="text-gray-500">Bead Tracking ID:</span>
                                        <span className="font-mono text-gray-700">{beadPaymentResponse.payment.trackingId}</span>
                                    </div>
                                    <div className="flex md:flex-row flex-col justify-between items-center">
                                        <span className="text-gray-500">Invoice ID:</span>
                                        <span className="font-mono text-gray-700">{beadPaymentResponse.invoice.id}</span>
                                    </div>
                                </div>
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
                            
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 