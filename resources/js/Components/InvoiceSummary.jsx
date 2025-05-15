import React from 'react';

const InvoiceSummary = ({ invoice }) => {
    const { tax_amount, subtotal, invoice_data } = invoice;
    const { productLines } = invoice_data;

    const formatCurrency = (amount) => {
        return parseFloat(amount).toFixed(2);
    };

    const calculateLineTotal = (quantity, rate) => {
        return parseFloat(quantity) * parseFloat(rate);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Summary</h2>
            
            <div className="space-y-4">
                {/* Product Lines */}
                {productLines.map((line, index) => (
                    <div key={index} className="flex justify-between items-start">
                        <div className="flex-1">
                            <p className="text-gray-800 font-medium">{line.description}</p>
                            <p className="text-sm text-gray-500">
                                {line.quantity} × ${formatCurrency(line.rate)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-800 font-medium">
                                ${formatCurrency(calculateLineTotal(line.quantity, line.rate))}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Divider */}
                <div className="border-t border-gray-200 my-4"></div>

                {/* Tax */}
                <div className="flex justify-between items-center">
                    <p className="text-gray-600">Tax</p>
                    <p className="text-gray-800 font-medium">${formatCurrency(tax_amount)}</p>
                </div>

                {/* Subtotal */}
                <div className="flex justify-between items-center">
                    <p className="text-gray-600">Subtotal</p>
                    <p className="text-gray-800 font-medium">${formatCurrency(subtotal)}</p>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <p className="text-lg font-semibold text-gray-800">Total</p>
                    <p className="text-lg font-semibold text-gray-800">
                        ${formatCurrency(parseFloat(subtotal) + parseFloat(tax_amount))}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default InvoiceSummary; 