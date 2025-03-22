import { useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import axios from 'axios';
import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

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
    });
    
    const [fetchingMerchant, setFetchingMerchant] = useState(false);
    const [merchantFetchError, setMerchantFetchError] = useState('');
    const [merchantData, setMerchantData] = useState(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // Check if merchant data exists before submitting
        if (!merchantData) {
            setMerchantFetchError('Please fetch a valid merchant before creating a user.');
            return;
        }
        
        // Ensure the gateway_id and merchant_id match before submission
        const formData = {
            ...data,
            merchant_id: data.gateway_id, // Enforce merchant_id to be the same as gateway_id
        };
        
        post(route('admin.users.store'), formData, {
            onError: (errors) => {
                console.log('Submission errors:', errors);
            },
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
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <h2 className="text-lg font-medium text-gray-900">
                                Create New User
                            </h2>
                            
                            {/* Gateway ID section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <h3 className="text-md font-medium text-gray-800 mb-2">
                                    Fetch Merchant Information
                                </h3>
                                <div className="flex items-end gap-4">
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
                                        <TextInput
                                            id="password"
                                            type="password"
                                            className="mt-1 block w-full"
                                            value={data.password}
                                            onChange={(e) => setData('password', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.password} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel htmlFor="password_confirmation" value="Confirm Password" />
                                        <TextInput
                                            id="password_confirmation"
                                            type="password"
                                            className="mt-1 block w-full"
                                            value={data.password_confirmation}
                                            onChange={(e) => setData('password_confirmation', e.target.value)}
                                            required
                                        />
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