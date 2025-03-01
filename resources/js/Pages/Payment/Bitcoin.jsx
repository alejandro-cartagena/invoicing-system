import React from 'react';
import { Head } from '@inertiajs/react';

export default function Bitcoin({ invoice, token }) {
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
                        
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                            <p className="text-yellow-700">
                                Bitcoin payment integration will be implemented soon.
                            </p>
                        </div>
                        
                        <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-md mb-6">
                            <p className="text-gray-500 mb-4">QR Code will appear here</p>
                            <div className="w-48 h-48 bg-gray-200 mx-auto flex items-center justify-center">
                                <span className="text-gray-400">QR Placeholder</span>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bitcoin Address</label>
                            <div className="flex">
                                <input type="text" className="flex-1 border-gray-300 rounded-l-md shadow-sm" value="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" disabled />
                                <button type="button" className="px-4 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-600">
                                    Copy
                                </button>
                            </div>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                            <p className="font-semibold">Instructions:</p>
                            <ol className="list-decimal pl-5 mt-2 space-y-1">
                                <li>Send exactly 0.00123 BTC to the address above</li>
                                <li>Payment will be confirmed after 1 blockchain confirmation</li>
                                <li>The invoice will be marked as paid automatically</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
