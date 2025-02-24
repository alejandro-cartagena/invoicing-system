import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUsers } from '@fortawesome/free-solid-svg-icons';

import AdminHomePageCard from '@/Components/AdminHomePageCard';

export default function Dashboard() {
    return (
        <AdminAuthenticatedLayout
            header={
                <h2 className="text-xl text-center font-semibold leading-tight text-gray-800">
                    Admin Dashboard
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="container mt-40">
                {/* Add admin-specific content here */}
                <div className="flex flex-col md:flex-row justify-center items-center gap-10">
                    <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faUserPlus} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="Create New User" 
                    description="Add new users and assign their roles"
                    className="h-full"
                    onClick={() => router.visit(route('admin.create'))}
                    />
                    <AdminHomePageCard
                    imageUrl={<FontAwesomeIcon 
                        icon={faUsers} 
                        className="w-full text-[var(--color-black-text)] text-7xl md:text-8xl" 
                    />}
                    imageAlt="Placeholder"
                    title="View All Users"
                    description="View and Manage Existing Users"
                    className="h-full"
                    onClick={() => router.visit(route('admin.users.index'))}
                    />
                </div>
            </div>
        </AdminAuthenticatedLayout>
    );
}
