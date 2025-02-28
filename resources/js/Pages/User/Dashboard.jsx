import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileInvoiceDollar, faHouse } from '@fortawesome/free-solid-svg-icons';

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


            <div className="container mt-40">
                {/* Add admin-specific content here */}
                <div className="flex flex-col md:flex-row justify-center items-center gap-10">
                    <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faFileInvoiceDollar} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="General Invoice" 
                    description="Create a general invoice"
                    className="h-full"
                    onClick={() => router.visit(route('user.general-invoice'))}
                    />
                    <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faHouse} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="Real Estate Invoice"
                    description="Create a real estate invoice"
                    className="h-full"
                    onClick={() => router.visit(route('admin.users.index'))}
                    />
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
}