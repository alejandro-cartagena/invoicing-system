import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import CreditCardForm from '@/Components/CreditCardForm';
import Swal from 'sweetalert2';

const CreditCard = ({ invoice, token, nmi_invoice_id }) => {
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    
    const handlePaymentSuccess = (data) => {
        setPaymentSuccess(true);
        Swal.fire({
            title: 'Payment Successful!',
            text: 'Your payment has been processed successfully.',
            icon: 'success',
            confirmButtonText: 'OK'
        });
    };
    
    const handlePaymentError = (message) => {
        Swal.fire({
            title: 'Payment Failed',
            text: message,
            icon: 'error',
            confirmButtonText: 'Try Again'
        });
    };
    
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <Head title="Credit Card Payment" />
            
            <div className="max-w-4xl mx-auto px-4">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-800">Invoice Payment</h1>
                    <p className="text-gray-600 mt-2">
                        Invoice #{invoice.invoice_number} - ${parseFloat(invoice.total).toFixed(2)}
                    </p>
                </div>
                
                {paymentSuccess ? (
                    <div className="bg-white p-8 rounded-lg shadow-md text-center">
                        <div className="text-green-500 text-5xl mb-4">✓</div>
                        <h2 className="text-2xl font-semibold mb-2">Payment Complete</h2>
                        <p className="text-gray-600 mb-4">
                            Thank you for your payment. A receipt has been sent to your email.
                        </p>
                    </div>
                ) : (
                    <CreditCardForm 
                        invoiceId={invoice.id}
                        amount={invoice.total}
                        nmiInvoiceId={nmi_invoice_id}
                        onSuccess={handlePaymentSuccess}
                        onError={handlePaymentError}
                    />
                )}
            </div>
        </div>
    );
};

export default CreditCard;
