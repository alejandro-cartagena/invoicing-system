import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faUsers } from '@fortawesome/free-solid-svg-icons';

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
                {/* Add user-specific content here */}
                <h1 className='text-center text-2xl font-bold'>Welcome to the User Dashboard</h1>
            </div>
        </UserAuthenticatedLayout>
    );
}
