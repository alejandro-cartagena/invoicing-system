import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import Checkbox from '@/Components/Checkbox';

export default function Create() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        password_confirmation: '',
        business_name: '',
        address: '',
        phone_number: '',
        merchant_id: '',
        first_name: '',
        last_name: '',
        gateway_id: '',
        // Add Bead credentials fields
        add_bead_credentials: false,
        bead_merchant_id: '',
        bead_terminal_id: '',
        bead_username: '',
        bead_password: '',
    });
    
    const [fetchingMerchant, setFetchingMerchant] = useState(false);
    const [merchantFetchError, setMerchantFetchError] = useState('');
    const [merchantData, setMerchantData] = useState(null);
    // Add state for password visibility
    const [showPassword, setShowPassword] = useState(false);
    const [showBeadPassword, setShowBeadPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Check if merchant data exists before submitting
        if (!merchantData) {
            setMerchantFetchError('Please fetch a valid merchant before creating a user.');
            return;
        }

        // Log the data being submitted
        console.log('Submitting form data:', data);
        
        // Ensure the gateway_id and merchant_id match before submission
        const formData = {
            ...data,
            merchant_id: data.gateway_id, // Enforce merchant_id to be the same as gateway_id
        };

        // Log the final form data
        console.log('Final form data being submitted:', formData);
        
        post(route('admin.users.store'), formData, {
            onSuccess: (response) => {
                console.log('Success response:', response);
                // You can add any success handling here
            },
            onError: (errors) => {
                console.log('Submission errors:', errors);
                // You can add any error handling here
            },
            onFinish: () => {
                console.log('Form submission finished');
            }
        });
    };
    
    // Function to fetch merchant information
    const fetchMerchantInfo = async () => {
        if (!data.gateway_id) {
            setMerchantFetchError('Please enter a Gateway ID');
            return;
        }
        
        setFetchingMerchant(true);
        setMerchantFetchError('');
        setMerchantData(null); // Clear any previous merchant data
        
        try {
            // Make a request to your backend endpoint that will call the NMI API
            const response = await axios.get(route('admin.fetch-merchant-info', { gateway_id: data.gateway_id }));
            
            if (response.data.success && response.data.merchant) {
                // Check if a user with this merchant_id already exists
                try {
                    const checkExistingResponse = await axios.get(route('admin.check-merchant-exists', { merchant_id: data.gateway_id }));
                    
                    if (checkExistingResponse.data.exists) {
                        setMerchantFetchError(`A user with Gateway ID "${data.gateway_id}" already exists in the system. Please use a different Gateway ID.`);
                        setFetchingMerchant(false);
                        return;
                    }
                } catch (error) {
                    console.error('Error checking existing merchant:', error);
                    // Continue with merchant data fetch even if check fails
                }
                
                setMerchantData(response.data);
                
                // NMI API response format might be different, adjust field mapping as needed
                const merchant = response.data.merchant;
                setData({
                    ...data,
                    business_name: merchant.company || merchant.name || '',
                    address: merchant.address1 || '',
                    phone_number: merchant.phone ? merchant.phone.replace(/\D/g, '') : '',
                    first_name: merchant.firstName || merchant.first_name || '',
                    last_name: merchant.lastName || merchant.last_name || '',
                    email: merchant.email || '',
                    merchant_id: data.gateway_id, // Use gateway_id as merchant_id
                    // Clear password fields when changing merchants
                    password: '',
                    password_confirmation: ''
                });
            } else {
                setMerchantFetchError(response.data.message || 'Could not fetch merchant information');
            }
        } catch (error) {
            console.error('Error fetching merchant:', error);
            setMerchantFetchError(
                error.response?.data?.message || 
                'Failed to fetch merchant information. Please check the Gateway ID and try again.'
            );
        } finally {
            setFetchingMerchant(false);
        }
    };


    return (
        <AdminAuthenticatedLayout>
            <div className="py-12 container">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-md rounded-lg">
                        <div className="p-6">
                            <h2 className="text-lg font-medium text-gray-900">
                                Create New User
                            </h2>
                            
                            {/* Gateway ID section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 className="text-md font-medium text-gray-800 mb-2">
                                    Fetch Merchant Information
                                </h3>
                                <div className="flex flex-col md:flex-row md:items-end gap-4">
                                    <div className="flex-1">
                                        <InputLabel htmlFor="gateway_id" value="Gateway ID" />
                                        <TextInput
                                            id="gateway_id"
                                            type="text"
                                            className="mt-1 block w-full"
                                            value={data.gateway_id}
                                            onChange={(e) => setData('gateway_id', e.target.value)}
                                        />
                                    </div>
                                    <PrimaryButton 
                                        type="button" 
                                        onClick={fetchMerchantInfo}
                                        disabled={fetchingMerchant}
                                        className="mb-1"
                                    >
                                        {fetchingMerchant ? 'Fetching...' : 'Fetch Merchant'}
                                    </PrimaryButton>
                                </div>
                                {merchantFetchError && (
                                    <p className="mt-2 text-sm text-red-600">{merchantFetchError}</p>
                                )}
                                <p className="mt-2 text-xs text-gray-500">
                                    Enter the Gateway ID provided by Voltms to fetch merchant information.
                                </p>
                            </div>
                            
                            {/* Only show merchant status when we have merchant data */}
                            {merchantData && (
                                <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <strong>Merchant Found:</strong> {merchantData.merchant.company || merchantData.merchant.name}
                                            <p className="text-sm text-green-600 mt-1">
                                                You can now complete the user registration below.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    
                                </div>
                            )}
                            
                            {merchantData ? (
                                <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                                    <div>
                                        <InputLabel htmlFor="email" value="Email" />
                                        <TextInput
                                            id="email"
                                            type="email"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            required
                                            readOnly
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            This field is automatically filled from merchant data.
                                        </p>
                                        <InputError message={errors.email} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password" value="Password" />
                                        <div className="relative">
                                            <TextInput
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                className="mt-1 block w-full pr-10"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                                        <div className="relative">
                                            <TextInput
                                                id="password_confirmation"
                                                type={showPassword ? "text" : "password"}
                                                className="mt-1 block w-full pr-10"
                                                value={data.password_confirmation}
                                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                {showPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="business_name" value="Business Name" />
                                        <TextInput
                                            id="business_name"
                                            type="text"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.business_name}
                                            onChange={(e) => setData('business_name', e.target.value)}
                                            required
                                            readOnly
                                        />
                                        <InputError message={errors.business_name} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="address" value="Address" />
                                        <TextInput
                                            id="address"
                                            type="text"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.address}
                                            onChange={(e) => setData('address', e.target.value)}
                                            required
                                            readOnly
                                        />
                                        <InputError message={errors.address} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="phone_number" value="Phone Number" />
                                        <TextInput
                                            id="phone_number"
                                            type="tel"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.phone_number}
                                            onChange={(e) => {
                                                const value = e.target.value.replace(/[^\d]/g, '');
                                                if (value.length <= 10) {
                                                    setData('phone_number', value);
                                                }
                                            }}
                                            maxLength={10}
                                            pattern="[0-9]*"
                                            required
                                            readOnly
                                        />
                                        <InputError message={errors.phone_number} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="merchant_id" value="Merchant ID (Gateway ID)" />
                                        <TextInput
                                            id="merchant_id"
                                            type="text"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.gateway_id}
                                            disabled
                                            readOnly
                                        />
                                        <p className="mt-1 text-xs text-gray-500">
                                            This field is automatically set from the Gateway ID and cannot be modified.
                                        </p>
                                        <InputError message={errors.merchant_id} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="first_name" value="First Name" />
                                        <TextInput
                                            id="first_name"
                                            type="text"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.first_name}
                                            onChange={(e) => setData('first_name', e.target.value)}
                                            required
                                            readOnly
                                        />
                                        <InputError message={errors.first_name} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="last_name" value="Last Name" />
                                        <TextInput
                                            id="last_name"
                                            type="text"
                                            className="mt-1 block w-full bg-gray-100"
                                            value={data.last_name}
                                            onChange={(e) => setData('last_name', e.target.value)}
                                            required
                                            readOnly
                                        />
                                        <InputError message={errors.last_name} className="mt-2" />
                                    </div>

                                    {/* Bead Credentials Section */}
                                    <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center mb-4">
                                            <Checkbox
                                                name="add_bead_credentials"
                                                checked={data.add_bead_credentials}
                                                onChange={(e) => setData('add_bead_credentials', e.target.checked)}
                                            />
                                            <InputLabel
                                                htmlFor="add_bead_credentials"
                                                value="Add Bead Credentials to Process Crypto Payments (Optional)"
                                                className="ml-2"
                                            />
                                        </div>

                                        {data.add_bead_credentials && (
                                            <div className="space-y-4">
                                                <div>
                                                    <InputLabel htmlFor="bead_merchant_id" value="Bead Merchant ID" />
                                                    <TextInput
                                                        id="bead_merchant_id"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={data.bead_merchant_id}
                                                        onChange={(e) => setData('bead_merchant_id', e.target.value)}
                                                    />
                                                    <InputError message={errors.bead_merchant_id} className="mt-2" />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="bead_terminal_id" value="Bead Terminal ID" />
                                                    <TextInput
                                                        id="bead_terminal_id"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={data.bead_terminal_id}
                                                        onChange={(e) => setData('bead_terminal_id', e.target.value)}
                                                    />
                                                    <InputError message={errors.bead_terminal_id} className="mt-2" />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="bead_username" value="Bead Username" />
                                                    <TextInput
                                                        id="bead_username"
                                                        type="text"
                                                        className="mt-1 block w-full"
                                                        value={data.bead_username}
                                                        onChange={(e) => setData('bead_username', e.target.value)}
                                                    />
                                                    <InputError message={errors.bead_username} className="mt-2" />
                                                </div>

                                                <div>
                                                    <InputLabel htmlFor="bead_password" value="Bead Password" />
                                                    <div className="relative">
                                                        <TextInput
                                                            id="bead_password"
                                                            type={showBeadPassword ? "text" : "password"}
                                                            className="mt-1 block w-full pr-10"
                                                            value={data.bead_password}
                                                            onChange={(e) => setData('bead_password', e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800"
                                                            onClick={() => setShowBeadPassword(!showBeadPassword)}
                                                        >
                                                            {showBeadPassword ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                                                </svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                    <InputError message={errors.bead_password} className="mt-2" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <PrimaryButton disabled={processing}>
                                            Create User
                                        </PrimaryButton>
                                    </div>
                                </form>
                            ) : (
                                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                                    <p className="text-amber-700">
                                        Please fetch a valid merchant account using the Gateway ID before creating a user.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminAuthenticatedLayout>
    );
}