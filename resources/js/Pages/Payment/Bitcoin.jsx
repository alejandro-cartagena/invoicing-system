import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';

export default function Bitcoin({ invoice, token }) {
    const [paymentData, setPaymentData] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initiateCryptoPayment();
    }, []);

    const initiateCryptoPayment = async () => {
        try 
        {
            setLoading(true);
            const response = await axios.post('/invoice/process-bitcoin', {
                token: token,
                invoiceId: invoice.id,
                amount: invoice.total
            });

            console.log("RESPONSE: ", response.data);

            console.log("Payment ID:", response.data.payment_data.trackingId);

            if (response.data.has_existing_payment) {
                const hasExistingPayment = response.data.has_existing_payment;
                const responseData = response.data.payment_data;
                const trackingId = responseData.trackingId;

                const paidAmount = responseData.amounts.paid.inPaymentCurrency.amount;
                const requestedAmount = responseData.amounts.requested.inPaymentCurrency.amount;
                const remainingAmount = requestedAmount - paidAmount;

                const beadPaymentUrl = `https://pay.qa.beadpay.io/${trackingId}`

                // Handle existing payment status if available
                if (hasExistingPayment && responseData) {
                    console.log("Existing Payment Status:", responseData);
                    setPaymentStatus(responseData.status_code);
                    
                    switch (responseData.status_code) {
                        case "created":
                            window.location.href = beadPaymentUrl;
                            break;
                        case "completed":
                            // Redirect to PaymentSuccess page with tracking ID
                            window.location.href = `/payment-success?trackingId=${trackingId}&status=completed`;
                            break;
                        case "underpaid":
                            alert(`The payment amount sent was less than required. The current amount paid is ${paidAmount} and the remaining amount is ${remainingAmount}. Redirecting to payment page.`);
                            window.location.href = beadPaymentUrl;
                            break;
                        case "overpaid":
                            // Still show success but with additional message about overpayment
                            window.location.href = `/payment-success?trackingId=${trackingId}&status=overpaid`;
                            break;
                        case "expired":
                            setError("This payment request has expired. Please initiate a new payment.");
                            setLoading(false);
                            break;
                        case "invalid":
                            setError("This payment is invalid. Please contact support or try initiating a new payment.");
                            setLoading(false);
                            break;
                        default:
                            setError("Unknown payment status. Please contact support.");
                            setLoading(false);
                            break;
                    }
                }
            }
            else if (response.data.success && response.data.payment_data && response.data.payment_data.paymentUrl) {
                // Redirect to the Bead payment URL
                window.location.href = response.data.payment_data.paymentUrl;
            }
            else {
                // Handle case where success is true but no paymentUrl is provided
                const errorMsg = response.data.success ? 
                    'Payment initiated but no payment URL was provided. Please contact support.' : 
                    response.data.message;
                setError(errorMsg);
                setLoading(false);
            }


        } catch (err) {
            setError(err.response?.data?.message || 'Failed to initiate crypto payment');
            setLoading(false);
        }
    };

    // Add a section to display payment status if available
    const renderPaymentStatus = () => {
        if (!paymentStatus) return null;

        return (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Payment Status</h3>
                <pre className="bg-white p-4 rounded overflow-auto">
                    {JSON.stringify(paymentStatus, null, 2)}
                </pre>
            </div>
        );
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

}
