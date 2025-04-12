import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import { Head } from '@inertiajs/react';

export default function EditUser({ user }) {
    const { data, setData, patch, processing, errors } = useForm({
        email: user.email,
        business_name: user.business_name,
        address: user.address,
        phone_number: user.phone_number,
        merchant_id: user.merchant_id,
        first_name: user.first_name,
        last_name: user.last_name,
        public_key: user.public_key,
        private_key: user.private_key
    });

    // Add state for API key generation
    const [generatingKeys, setGeneratingKeys] = useState(false);
    const [apiKeys, setApiKeys] = useState(null);
    const [apiKeyError, setApiKeyError] = useState('');
    const [hasExistingKeys, setHasExistingKeys] = useState(false);

    // Check if user already has API keys
    useEffect(() => {
        // Check if the user prop contains public_key and private_key
        if (user && user.public_key && user.private_key) {
            setHasExistingKeys(true);
            setApiKeys({
                publicKey: user.public_key,
                privateKey: user.private_key
            });
        } else {
            setHasExistingKeys(false);
            setApiKeys(null);
        }
    }, [user]);


    const handleSubmit = (e) => {
        e.preventDefault();
        // Form submission disabled as fields are read-only
    };

    const handleBack = () => {
        router.get(route('admin.users.index'));
    };

    // Function to generate API keys
    const generateApiKeys = async () => {
        setGeneratingKeys(true);
        setApiKeyError('');
        console.log('Starting API key generation process');

        try {
            // Use the merchant_id as the gateway_id
            const gatewayId = data.merchant_id;
            console.log('Using gateway ID:', gatewayId);
            
            // Generate keys using the dedicated endpoint that checks for existing keys
            // and only creates new ones if necessary
            try {
                console.log('Calling primary endpoint: admin.users.generate-api-keys');
                const userKeysResponse = await axios.post(route('admin.users.generate-api-keys', { user: user.id }));
                console.log('Response from primary endpoint:', userKeysResponse.data);
                
                if (userKeysResponse.data && userKeysResponse.data.success) {
                    console.log('Successfully obtained keys from primary endpoint');
                    // Keys were either retrieved or generated - update UI
                    setApiKeys({
                        publicKey: userKeysResponse.data.public_key,
                        privateKey: userKeysResponse.data.private_key
                    });
                    setHasExistingKeys(true);
                    
                    // Update form data in case keys were just created
                    setData(prevData => ({
                        ...prevData,
                        public_key: userKeysResponse.data.public_key,
                        private_key: userKeysResponse.data.private_key
                    }));
                    
                    return;
                }
            } catch (userKeysError) {
                console.error('Error from admin.users.generate-api-keys endpoint:', userKeysError);
                
                // If keys already exist, update UI accordingly
                if (userKeysError.response?.data?.error === 'API keys already exist for this user') {
                    console.log('Keys already exist for this user');
                    setHasExistingKeys(true);
                    
                    // If keys were returned in the error response, show them
                    if (userKeysError.response.data.public_key && userKeysError.response.data.private_key) {
                        console.log('Using existing keys returned in the response');
                        setApiKeys({
                            publicKey: userKeysError.response.data.public_key,
                            privateKey: userKeysError.response.data.private_key
                        });
                    }
                    return;
                }
                
                // For other errors, set error message and try fallback method
                setApiKeyError(userKeysError.response?.data?.error || 'Failed to generate API keys');
            }
            
            // Only reach this point if the primary method failed for a reason other than "keys already exist"
            console.log('Primary endpoint failed, trying fallback method');
            
            // Fallback method: Generate keys via the merchant keys endpoint
            console.log('Calling fallback endpoint: admin.generate-merchant-api-keys');
            const response = await axios.post(route('admin.generate-merchant-api-keys', { 
                gateway_id: gatewayId 
            }));

            console.log('Response from fallback endpoint:', response.data);
            
            if (response.data.success) {
                const publicKey = response.data.public_key || '';
                const privateKey = response.data.private_key || '';
                
                console.log('Keys obtained from fallback endpoint, updating form data');
                
                // Update the form data with the new keys
                setData({
                    ...data,
                    public_key: publicKey,
                    private_key: privateKey
                });
                
                // Save the updated user data to the database
                console.log('Saving keys to database');
                patch(route('admin.users.update', user.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        console.log('Successfully saved keys to database');
                        // Set the keys in the state for display
                        setApiKeys({
                            publicKey: publicKey,
                            privateKey: privateKey
                        });
                        setHasExistingKeys(true);
                    }
                });
                
            } else {
                console.error('Fallback endpoint failed:', response.data.message);
                setApiKeyError(response.data.message || 'Failed to generate API keys');
            }
        } catch (error) {
            console.error('Error generating API keys:', error);
            console.error('Error response:', error.response?.data);
            setApiKeyError(
                error.response?.data?.message || error.response?.data?.error || 
                'An error occurred while generating API keys'
            );
        } finally {
            setGeneratingKeys(false);
        }
    };

    return (
        <AdminAuthenticatedLayout>
            <Head title="User Details" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-lg sm:rounded-lg">
                        <div className="p-6">
                            <button
                                onClick={handleBack}
                                className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 mb-6"
                            >
                                &#8592; Back to Users
                            </button>
                            <h2 className="text-lg font-medium text-gray-900">
                                User Details
                            </h2>
                            <p className="text-sm text-gray-600 mt-1 mb-4">
                                View user information and manage API keys. Fields are read-only.
                            </p>

                            {/* API Key generation section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex md:flex-row flex-col justify-between md:items-center">
                                    <div>
                                        <h3 className="text-md font-medium text-gray-800">
                                            API Keys
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Generate API keys for this merchant to use with payment processing.
                                        </p>
                                        {hasExistingKeys && !apiKeys && (
                                            <p className="text-sm text-green-600 mt-1">
                                                This user already has API keys generated.
                                            </p>
                                        )}
                                    </div>
                                    <div className="my-4 md:my-0">
                                        <PrimaryButton
                                            type="button"
                                            onClick={generateApiKeys}
                                            disabled={generatingKeys || hasExistingKeys}
                                            className={hasExistingKeys ? "bg-gray-400 cursor-not-allowed" : ""}
                                        >
                                            {generatingKeys ? 'Generating...' : hasExistingKeys ? 'Keys Generated' : 'Generate API Keys'}
                                        </PrimaryButton>
                                    </div>
                                </div>
                                
                                {apiKeyError && (
                                    <p className="mt-2 text-sm text-red-600">{apiKeyError}</p>
                                )}
                                
                                {/* Display API keys if they exist */}
                                {apiKeys && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-medium text-blue-800">API Keys:</h4>
                                        <div className="mt-2">
                                            <p className="text-sm mt-1">
                                                <strong>Private Key:</strong> <code className="bg-blue-100 px-1">{apiKeys.privateKey}</code>
                                            </p>
                                            <p className="text-sm">
                                                <strong>Public Key:</strong> <code className="bg-blue-100 px-1">{apiKeys.publicKey}</code>
                                            </p>
                                            <p className="text-xs text-blue-600 mt-2">
                                                {hasExistingKeys ? 
                                                    "These keys are saved with the user's profile." :
                                                    "These keys have been generated but not saved to the user profile. Copy them now if needed."}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                                <div>
                                    <InputLabel htmlFor="email" value="Email" />
                                    <TextInput
                                        id="email"
                                        type="email"
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        required
                                        readOnly
                                    />
                                    <InputError message={errors.email} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="business_name" value="Business Name" />
                                    <TextInput
                                        id="business_name"
                                        type="text"
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
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
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
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
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
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
                                    <InputLabel htmlFor="merchant_id" value="Merchant ID" />
                                    <TextInput
                                        id="merchant_id"
                                        type="text"
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
                                        value={data.merchant_id}
                                        onChange={(e) => setData('merchant_id', e.target.value)}
                                        required
                                        readOnly
                                    />
                                    <InputError message={errors.merchant_id} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="first_name" value="First Name" />
                                    <TextInput
                                        id="first_name"
                                        type="text"
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
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
                                        className="mt-1 block w-full bg-gray-100 cursor-not-allowed"
                                        value={data.last_name}
                                        onChange={(e) => setData('last_name', e.target.value)}
                                        required
                                        readOnly
                                    />
                                    <InputError message={errors.last_name} className="mt-2" />
                                </div>

                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AdminAuthenticatedLayout>
    );
}
