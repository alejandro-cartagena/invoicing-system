import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function PaymentSuccess() {
    const [beadPaymentResponse, setBeadPaymentResponse] = useState(null);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [invoiceItems, setInvoiceItems] = useState([]);

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
            const trackingId = invoice.bead_payment_id;

            // Set invoice items
            setInvoiceItems(invoice.invoice_data.productLines);

            // Step 2: Use trackingId to check payment status
            return axios.post('/api/bead/verify-payment', {
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
            
            <div className="container md:max-w-3xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    {loading && (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-300 border-t-blue-600 mx-auto mb-6"></div>
                            <h2 className="text-xl font-semibold text-gray-700">Verifying Payment</h2>
                            <p className="text-gray-500 mt-2">Please wait while we process your payment...</p>
                        </div>
                    )}
                    
                    {!loading && status === 'processing' && (
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                            <h2 className="text-xl font-bold mt-4 mb-2">Verifying Payment</h2>
                            <p className="text-gray-600">Please wait while we verify your payment...</p>
                        </div>
                    )}
                    
                    {!loading && status === 'completed' && (
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
                            <div className="max-w-md mx-auto bg-gray-50 rounded-lg p-6 shadow-sm mb-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h3>
                                <div className="space-y-4">
                                    {invoiceItems.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center border-b border-gray-200 pb-3">
                                            <div>
                                                <p className="text-gray-800 font-medium">{item.description}</p>
                                                <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                            </div>
                                            <p className="text-gray-800 font-medium">${item.rate}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="text-center mb-6">
                                <p className="text-gray-600">
                                    <svg className="w-5 h-5 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                    </svg>
                                    A confirmation email has been sent to your email address
                                </p>
                            </div>
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
                    
                    {!loading && status === 'failed' && (
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