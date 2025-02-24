import React, { useState } from 'react';
import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import UserCard from '@/Components/UserCard';
import { faSearch, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import { router } from '@inertiajs/react';

// Add props to receive the users data
const ViewUsers = ({ users }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;

    // Filter users based on search
    const filteredUsers = users.filter(user => 
        user.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate pagination
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const displayedUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

    const handleEdit = (userId) => {
        router.get(route('admin.users.edit', userId));
    };

    const handleDelete = (userId, email) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete user ${email}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('admin.users.destroy', userId), {
                    onSuccess: () => {
                        Swal.fire(
                            'Deleted!',
                            'User has been deleted.',
                            'success'
                        );
                    },
                    onError: () => {
                        Swal.fire(
                            'Error!',
                            'Failed to delete user.',
                            'error'
                        );
                    },
                });
            }
        });
    };

    return (
        <AdminAuthenticatedLayout>
            <div className="container mx-auto px-4">
                <h1 className='text-3xl font-bold my-8'>View Users</h1>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search users..."
                            className="w-full p-2 pl-10 border rounded"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <FontAwesomeIcon 
                            icon={faSearch} 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        />
                    </div>
                </div>

                {/* User Cards */}
                <div className="space-y-4">
                    {displayedUsers.map((user) => (
                        <UserCard
                            key={user.id}
                            companyName={user.businessName}
                            email={user.email}
                            dateCreated={user.dateCreated}
                            onEdit={() => handleEdit(user.id)}
                            onDelete={() => handleDelete(user.id, user.email)}
                        />
                    ))}
                    
                    {displayedUsers.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No users found matching your search.
                        </div>
                    )}
                </div>

                {/* Pagination controls if needed */}
            </div>
        </AdminAuthenticatedLayout>
    );
}

export default ViewUsers;
