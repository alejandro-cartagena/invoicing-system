import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
// import InvoicePage from '@/Components/GeneralInvoiceComponents/InvoicePage';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
// import '../../scss/main.scss';

const GeneralInvoice = () => {
    // const [invoiceData, setInvoiceData] = useState(null);

    // useEffect(() => {
    //     // Load saved invoice data from localStorage on component mount
    //     const savedInvoice = window.localStorage.getItem('invoiceData');
    //     if (savedInvoice) {
    //         try {
    //             const data = JSON.parse(savedInvoice);
    //             setInvoiceData(data);
    //         } catch (error) {
    //             console.error('Error parsing saved invoice:', error);
    //         }
    //     }
    // }, []);

    // const handleInvoiceUpdate = (invoice) => {
    //     // Save updated invoice data to localStorage
    //     window.localStorage.setItem('invoiceData', JSON.stringify(invoice));
    // };

    return (
        <UserAuthenticatedLayout
            header={
                <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
                    Create Your General Invoice
                </h2>
            }
        >
            <Head title="General Invoice" />
            <div className="container">
                {/* <InvoicePage 
                    data={invoiceData} 
                    onChange={handleInvoiceUpdate} 
                /> */}
            </div>
        </UserAuthenticatedLayout>
    );
}

export default GeneralInvoice;