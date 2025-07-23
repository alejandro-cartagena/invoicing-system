import React from 'react';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import countryList from '@/data/countryList';
import statesList from '@/data/statesList';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

const CustomerCreateModal = ({ show, onClose, onCustomerCreated = null }) => {
    // Form for creating customers
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        email: '',
        first_name: '',
        last_name: '',
        company: '',
        country: '',
        state: '',
        address: '',
        address2: '',
        city: '',
        postal_code: '',
        phone_number: '',
    });

    const handleCreateCustomer = async (e) => {
        e.preventDefault();
        
        if (onCustomerCreated) {
            // If we have a callback (from CustomerModal), use axios to create and get the customer data
            try {
                const response = await axios.post(route('user.customer.store'), data);
                
                if (response.status === 200 || response.status === 201) {
                    // Close modal and reset form
                    reset();
                    onClose();
                    clearErrors();
                    
                    // Show success message
                    Swal.fire({
                        title: 'Success!',
                        text: 'Customer created successfully.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    // Call the callback with the new customer data
                    // We need to fetch the created customer with the correct format
                    const customerResponse = await axios.get(route('api.customers'), {
                        params: { search: data.email }
                    });
                    
                    // Find the newly created customer
                    const newCustomer = customerResponse.data.find(customer => 
                        customer.email === data.email
                    );
                    
                    if (newCustomer && onCustomerCreated) {
                        onCustomerCreated(newCustomer);
                    }
                }
            } catch (error) {
                console.error('Error creating customer:', error);
                
                if (error.response?.data?.errors) {
                    // Handle validation errors
                    const validationErrors = error.response.data.errors;
                    Object.keys(validationErrors).forEach(key => {
                        // You might want to handle these errors differently
                        console.error(`${key}: ${validationErrors[key].join(', ')}`);
                    });
                }
                
                Swal.fire({
                    title: 'Error!',
                    text: error.response?.data?.message || 'Failed to create customer. Please try again.',
                    icon: 'error'
                });
            }
        } else {
            // Use Inertia form submission (for Index page)
            post(route('user.customer.store'), {
                onStart: () => {
                    // Close modal and reset form immediately when the request starts
                    reset();
                    onClose();
                },
                onSuccess: () => {
                    // Show success message after redirect completes
                    Swal.fire({
                        title: 'Success!',
                        text: 'Customer created successfully.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    });
                },
                onError: () => {
                    // Reopen modal if there's an error
                    show = true;
                    Swal.fire({
                        title: 'Error!',
                        text: 'Failed to create customer. Please check the form and try again.',
                        icon: 'error'
                    });
                }
            });
        }
    };

    const closeModal = () => {
        onClose();
        reset();
        clearErrors();
    };

    return (
        <Modal show={show} onClose={closeModal} maxWidth="2xl">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Create New Customer</h3>
                    <button
                        onClick={closeModal}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <form onSubmit={handleCreateCustomer} className="space-y-4">
                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="first_name" value="First Name *" />
                            <TextInput
                                id="first_name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.first_name}
                                onChange={(e) => setData('first_name', e.target.value)}
                                required
                            />
                            <InputError message={errors.first_name} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="last_name" value="Last Name *" />
                            <TextInput
                                id="last_name"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.last_name}
                                onChange={(e) => setData('last_name', e.target.value)}
                                required
                            />
                            <InputError message={errors.last_name} className="mt-2" />
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <InputLabel htmlFor="email" value="Email *" />
                            <TextInput
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                            />
                            <InputError message={errors.email} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="phone_number" value="Phone Number" />
                            <TextInput
                                id="phone_number"
                                type="tel"
                                className="mt-1 block w-full"
                                value={data.phone_number}
                                onChange={(e) => setData('phone_number', e.target.value)}
                            />
                            <InputError message={errors.phone_number} className="mt-2" />
                        </div>
                    </div>

                    {/* Company Information */}
                    <div>
                        <InputLabel htmlFor="company" value="Company" />
                        <TextInput
                            id="company"
                            type="text"
                            className="mt-1 block w-full"
                            value={data.company}
                            onChange={(e) => setData('company', e.target.value)}
                        />
                        <InputError message={errors.company} className="mt-2" />
                    </div>

                    {/* Address Information */}
                    <div>
                        <InputLabel htmlFor="address" value="Street Address" />
                        <TextInput
                            id="address"
                            type="text"
                            className="mt-1 block w-full"
                            value={data.address}
                            onChange={(e) => setData('address', e.target.value)}
                        />
                        <InputError message={errors.address} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="address2" value="Address Line 2" />
                        <TextInput
                            id="address2"
                            type="text"
                            className="mt-1 block w-full"
                            value={data.address2}
                            onChange={(e) => setData('address2', e.target.value)}
                        />
                        <InputError message={errors.address2} className="mt-2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <InputLabel htmlFor="city" value="City" />
                            <TextInput
                                id="city"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.city}
                                onChange={(e) => setData('city', e.target.value)}
                            />
                            <InputError message={errors.city} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="state" value="State" />
                            <select
                                id="state"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                value={data.state}
                                onChange={(e) => setData('state', e.target.value)}
                            >
                                <option value="">Select State</option>
                                {statesList.map((state) => (
                                    <option key={state.value} value={state.value}>
                                        {state.text}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.state} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="postal_code" value="Postal Code" />
                            <TextInput
                                id="postal_code"
                                type="text"
                                className="mt-1 block w-full"
                                value={data.postal_code}
                                onChange={(e) => setData('postal_code', e.target.value)}
                            />
                            <InputError message={errors.postal_code} className="mt-2" />
                        </div>
                    </div>

                    <div>
                        <InputLabel htmlFor="country" value="Country" />
                        <select
                            id="country"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={data.country}
                            onChange={(e) => setData('country', e.target.value)}
                        >
                            <option value="">Select Country</option>
                            {countryList.map((country) => (
                                <option key={country.value} value={country.value}>
                                    {country.text}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.country} className="mt-2" />
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-4">
                        <SecondaryButton onClick={closeModal} type="button">
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={processing}>
                            {processing ? 'Creating...' : 'Create Customer'}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default CustomerCreateModal; 