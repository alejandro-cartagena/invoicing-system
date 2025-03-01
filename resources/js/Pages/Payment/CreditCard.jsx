import React from 'react';
import { Head } from '@inertiajs/react';

export default function CreditCard({ invoice, token }) {
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <Head title="Credit Card Payment" />
            
            <div className="max-w-3xl mx-auto sm:px-6 lg:px-8">
                <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                    <div className="p-6 bg-white border-b border-gray-200">
                        <h1 className="text-2xl font-bold mb-6">Pay Invoice with Credit Card</h1>
                        
                        <div className="mb-6">
                            <h2 className="text-lg font-semibold">Invoice Details</h2>
                            <p className="mt-2">Invoice Number: {invoice.invoice_number}</p>
                            <p>Amount Due: ${invoice.total}</p>
                            <p>Due Date: {new Date(invoice.due_date).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <p className="text-yellow-700">
                                Credit card payment integration will be implemented soon.
                            </p>
                        </div>
                        
                        <form className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Card Number</label>
                                <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="1234 5678 9012 3456" disabled />
                            </div>
                            
                            <div className="flex space-x-4">
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                                    <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="MM/YY" disabled />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium text-gray-700">CVC</label>
                                    <input type="text" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="123" disabled />
                                </div>
                            </div>
                            
                            <button type="button" className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500" disabled>
                                Pay ${invoice.total}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
