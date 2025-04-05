import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function Bitcoin({ invoice, token }) {
    const [paymentData, setPaymentData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initiateCryptoPayment();
    }, []);

    const initiateCryptoPayment = async () => {
        try {
            setLoading(true);
            const response = await axios.post('/general-invoice/process-bitcoin', {
                token: token,
                invoiceId: invoice.id,
                amount: invoice.total
            });

            if (response.data.success) {
                // Redirect to the Bead payment URL
                window.location.href = response.data.payment_data.paymentUrl;
            } else {
                setError(response.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate crypto payment');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        // Optionally add some UI feedback for successful copy
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                            <p className="mt-4">Initializing Bitcoin payment...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-100 py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <div className="text-center text-red-600">
                            <h2 className="text-xl font-bold mb-2">Error</h2>
                            <p>{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <Head title="Bitcoin Payment" />
            
            <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                    <div className="p-6 bg-white border-b border-gray-200">
                        <h1 className="text-2xl font-bold mb-6">Pay Invoice with Bitcoin</h1>
                        
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold">Invoice Details</h2>
                            <p className="mt-2">Invoice Number: {invoice.invoice_number}</p>
                            <p>Amount Due: ${invoice.total}</p>
                            <p>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
                        </div>

                        {paymentData && (
                            <>
                                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-md mb-6">
                                    {paymentData.qrCode && (
                                        <img 
                                            src={paymentData.qrCode} 
                                            alt="Bitcoin Payment QR Code" 
                                            className="mx-auto mb-4"
                                        />
                                    )}
                                </div>
                                
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Bitcoin Address
                                    </label>
                                    <div className="flex">
                                        <input 
                                            type="text" 
                                            className="flex-1 border-gray-300 rounded-l-md shadow-sm" 
                                            value={paymentData.address || ''} 
                                            readOnly 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => copyToClipboard(paymentData.address)}
                                            className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600 hover:bg-gray-200"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Amount to Send (BTC)
                                    </label>
                                    <div className="flex">
                                        <input 
                                            type="text" 
                                            className="flex-1 border-gray-300 rounded-l-md shadow-sm" 
                                            value={paymentData.btcAmount || ''} 
                                            readOnly 
                                        />
                                        <button 
                                            type="button" 
                                            onClick={() => copyToClipboard(paymentData.btcAmount)}
                                            className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600 hover:bg-gray-200"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-gray-600">
                                    <p className="font-semibold">Instructions:</p>
                                    <ol className="list-decimal pl-5 mt-2 space-y-1">
                                        <li>Send exactly {paymentData.btcAmount} BTC to the address above</li>
                                        <li>Payment will be confirmed after {paymentData.requiredConfirmations || 1} blockchain confirmation(s)</li>
                                        <li>The invoice will be marked as paid automatically once confirmed</li>
                                        <li>This payment request will expire in {paymentData.expiresIn || '30'} minutes</li>
                                    </ol>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
