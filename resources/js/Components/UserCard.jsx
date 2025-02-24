import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEdit } from '@fortawesome/free-solid-svg-icons';


const UserCard = ({ imageUrl, companyName, email, dateCreated, onEdit, onDelete }) => {
    return (
        <div className="flex flex-col gap-4 md:gap-0 md:flex-row items-center justify-between bg-white p-6 rounded-lg shadow-lg hover:shadow-red-300 transition-all duration-300">
            {/* Left section: Image, Company Name, and Email */}
            <div className="flex items-center md:w-[400px] md:min-w-[400px]">
                <img 
                    src={imageUrl} 
                    alt={`${companyName} logo`} 
                    className="w-20 h-20 rounded-full object-cover mr-4"
                />
                <div className="overflow-hidden">
                    <h2 className="text-xl font-semibold text-[var(--color-black-text)] truncate">{companyName}</h2>
                    <p className="text-gray-600 truncate">{email}</p>
                </div>
            </div>

            {/* Middle section: Date Created */}
            <div className="flex-shrink-0 w-48">
                <p className="text-lg text-gray-500">
                    Created: {new Date(dateCreated).toLocaleDateString()}
                </p>
            </div>

            {/* Right section: Action Icons */}
            <div className="flex justify-center md:justify-end space-x-6 w-32">
                <button 
                    onClick={onEdit}
                    className="text-[var(--color-black-text)] cursor-pointer hover:text-blue-800 transition-colors duration-200 relative group"
                    aria-label="Edit User"
                >
                    <FontAwesomeIcon icon={faEdit} className="text-xl" />
                    <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded whitespace-nowrap">
                        Edit User
                    </span>
                </button>
                <button 
                    onClick={onDelete}
                    className="text-[var(--color-black-text)] cursor-pointer hover:text-red-800 transition-colors duration-200 relative group"
                    aria-label="Delete User"
                >
                    <FontAwesomeIcon icon={faTrash} className="text-xl" />
                    <span className="invisible group-hover:visible absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-2 py-1 rounded whitespace-nowrap">
                        Delete User
                    </span>
                </button>
            </div>
        </div>
    );
};


export default UserCard;
