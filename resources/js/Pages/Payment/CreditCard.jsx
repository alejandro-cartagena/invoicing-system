import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import CreditCardForm from '@/Components/CreditCardForm';
import InvoiceSummary from '@/Components/InvoiceSummary';
import Swal from 'sweetalert2';

const CreditCard = ({ invoice, nmi_invoice_id }) => {
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    
    const handlePaymentSuccess = () => {
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

    console.log(nmi_invoice_id);

    console.log("invoice",  invoice);
    
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <Head title="Credit Card Payment" />
            
            <div className="max-w-6xl mx-auto px-4">
                <div className={`mb-8 text-center ${!paymentSuccess ? 'lg:w-[65%]' : ''}`}>
                    <h1 className="text-3xl font-bold text-gray-800">Invoice Payment</h1>
                    <p className="text-gray-600 mt-2">
                        Invoice #{invoice.nmi_invoice_id}
                    </p>
                </div>
                
                <div className="flex flex-col lg:flex-row gap-8">
                    {paymentSuccess ? (
                        <div className="bg-white p-8 rounded-lg shadow-md text-center w-full">
                            <div className="text-green-500 text-5xl mb-4">✓</div>
                            <h2 className="text-2xl font-semibold mb-2">Payment Complete</h2>
                            <p className="text-gray-600 mb-6">
                                Thank you for your payment. A receipt has been sent to your email.
                            </p>
                            
                            <div className="max-w-md mx-auto bg-gray-50 p-6 rounded-lg">
                                <h3 className="text-lg font-semibold mb-4">Payment Details</h3>
                                
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span className="font-medium">${invoice.subtotal}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Tax:</span>
                                        <span className="font-medium">${invoice.tax_amount}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-t pt-2">
                                        <span className="text-gray-600 font-semibold">Total Paid:</span>
                                        <span className="font-semibold text-lg">${invoice.total}</span>
                                    </div>
                                </div>

                                {invoice.invoice_data?.productLines && invoice.invoice_data.productLines.length > 0 && (
                                    <div className="mt-6">
                                        <h3 className="text-lg font-semibold mb-3">Items Purchased</h3>
                                        <div className="space-y-3">
                                            {invoice.invoice_data.productLines.map((item, index) => (
                                                <div key={index} className="text-left bg-white p-3 rounded border">
                                                    <div className="font-medium">{item.description}</div>
                                                    <div className="flex justify-between text-sm text-gray-600 mt-1">
                                                        <span>Qty: {item.quantity}</span>
                                                        <span>Rate: ${item.rate}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="lg:w-[65%]">
                                <CreditCardForm 
                                    invoiceId={nmi_invoice_id}
                                    amount={invoice.total}
                                    onSuccess={handlePaymentSuccess}
                                    onError={handlePaymentError}
                                />
                            </div>
                            <div className="lg:w-[35%]">
                                <InvoiceSummary invoice={invoice} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreditCard;
