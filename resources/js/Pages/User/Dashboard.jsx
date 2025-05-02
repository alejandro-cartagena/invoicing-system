import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileCirclePlus,faFileInvoice, faReceipt } from '@fortawesome/free-solid-svg-icons';

import AdminHomePageCard from '@/Components/AdminHomePageCard';

export default function Dashboard() {
    return (
        <UserAuthenticatedLayout
            header={
                <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
                    User Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />


            <div className="container mt-20 mb-20 md:mt-30 ">
                {/* Add admin-specific content here */}
                <div className="flex flex-col flex-wrap md:flex-row justify-center items-center gap-10">

                    {/* Create Invoices */}
                    <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faFileCirclePlus} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="Create Invoices" 
                    description="Create invoices for your customers"
                    className="h-full"
                    onClick={() => router.visit(route('user.create-invoices'))}
                    />

                    {/* View Invoices */}
                    <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faFileInvoice} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="View Invoices"
                    description="View invoice statuses from your customers"
                    className="h-full"
                    onClick={() => router.visit(route('user.invoices'))}
                    />

                    {/* View Transactions */}
                    {/* <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faReceipt} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="View Transactions"
                    description="View transaction history from your customers"
                    className="h-full"
                    onClick={() => router.visit(route('user.transactions'))}
                    /> */}
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
}
