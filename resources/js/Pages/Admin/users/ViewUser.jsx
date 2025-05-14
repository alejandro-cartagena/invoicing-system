import { useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';
import Checkbox from '@/Components/Checkbox';
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
    const [loadingApiKeys, setLoadingApiKeys] = useState(true);

    // Add state for Bead credentials
    const [beadCredentials, setBeadCredentials] = useState(null);
    const [beadCredentialsError, setBeadCredentialsError] = useState('');
    const [loadingBeadCredentials, setLoadingBeadCredentials] = useState(false);
    const [showBeadForm, setShowBeadForm] = useState(false);
    const [isEditingBead, setIsEditingBead] = useState(false);

    // Add form for Bead credentials
    const { data: beadData, setData: setBeadData, post: postBead, put: putBead, processing: processingBead, errors: beadErrors, setError: setBeadError, clearErrors: clearBeadErrors } = useForm({
        merchant_id: '',
        terminal_id: '',
        username: '',
        password: '',
        status: 'manual',
        onboarding_status: 'NEEDS_INFO'
    });

    // Add state for password visibility
    const [showPassword, setShowPassword] = useState(false);

    // Function to fetch Bead credentials
    const fetchBeadCredentials = async () => {
        setLoadingBeadCredentials(true);
        try {
            const response = await axios.get(route('admin.users.bead-credentials', { user: user.id }));
            setBeadCredentials(response.data.credentials);
            setBeadCredentialsError('');
        } catch (error) {
            // Only set error for actual errors, not for 404 (no credentials)
            if (error.response?.status !== 404) {
                setBeadCredentialsError('Failed to fetch Bead credentials');
            }
            setBeadCredentials(null);
        } finally {
            setLoadingBeadCredentials(false);
        }
    };

    // Check if user already has API keys
    useEffect(() => {
        setLoadingApiKeys(true);
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
        setLoadingApiKeys(false);
    }, [user]);

    // Add useEffect for fetching Bead credentials
    useEffect(() => {
        fetchBeadCredentials();
    }, [user.id]);

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

        try {
            // Use the merchant_id as the gateway_id
            const gatewayId = data.merchant_id;
            
            // Generate keys using the dedicated endpoint that checks for existing keys
            // and only creates new ones if necessary
            try {
                const userKeysResponse = await axios.post(route('admin.users.generate-api-keys', { user: user.id }));
                
                if (userKeysResponse.data && userKeysResponse.data.success) {
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
                // If keys already exist, update UI accordingly
                if (userKeysError.response?.data?.error === 'API keys already exist for this user') {
                    setHasExistingKeys(true);
                    
                    // If keys were returned in the error response, show them
                    if (userKeysError.response.data.public_key && userKeysError.response.data.private_key) {
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
            
            // Fallback method: Generate keys via the merchant keys endpoint
            const response = await axios.post(route('admin.generate-merchant-api-keys', { 
                gateway_id: gatewayId 
            }));
            
            if (response.data.success) {
                const publicKey = response.data.public_key || '';
                const privateKey = response.data.private_key || '';
                
                // Update the form data with the new keys
                setData({
                    ...data,
                    public_key: publicKey,
                    private_key: privateKey
                });
                
                // Save the updated user data to the database
                patch(route('admin.users.update', user.id), {
                    preserveScroll: true,
                    onSuccess: () => {
                        // Set the keys in the state for display
                        setApiKeys({
                            publicKey: publicKey,
                            privateKey: privateKey
                        });
                        setHasExistingKeys(true);
                    }
                });
                
            } else {
                setApiKeyError(response.data.message || 'Failed to generate API keys');
            }
        } catch (error) {
            setApiKeyError(
                error.response?.data?.message || error.response?.data?.error || 
                'An error occurred while generating API keys'
            );
        } finally {
            setGeneratingKeys(false);
        }
    };

    const handleBeadSubmit = async (e) => {
        e.preventDefault();
        clearBeadErrors(); // Clear any previous errors
        
        try {
            if (isEditingBead) {
                // Update existing credentials
                const response = await axios.put(route('admin.bead-credentials.update', { id: beadCredentials.id }), {
                    merchant_id: beadData.merchant_id,
                    terminal_id: beadData.terminal_id,
                    username: beadData.username,
                    password: beadData.password || undefined, // Only send password if it's not empty
                    status: beadData.status,
                    onboarding_status: beadData.onboarding_status,
                    user_id: user.id
                });
                
                if (response.data) {
                    setShowBeadForm(false);
                    setIsEditingBead(false);
                    // Refresh the Bead credentials
                    fetchBeadCredentials();
                }
            } else {
                // Create new credentials
                const response = await axios.post(route('admin.bead-credentials.store'), {
                    merchant_id: beadData.merchant_id,
                    terminal_id: beadData.terminal_id,
                    username: beadData.username,
                    password: beadData.password,
                    status: beadData.status,
                    onboarding_status: beadData.onboarding_status,
                    user_id: user.id
                });
                
                if (response.data) {
                    setShowBeadForm(false);
                    // Refresh the Bead credentials
                    fetchBeadCredentials();
                }
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                // Handle validation errors
                Object.keys(error.response.data.errors).forEach(key => {
                    setBeadError(key, error.response.data.errors[key][0]);
                });
            } else {
                setBeadCredentialsError('Failed to save Bead credentials');
            }
        }
    };

    const handleEditBead = () => {
        clearBeadErrors(); // Clear any previous errors
        // Pre-fill the form with existing credentials
        setBeadData({
            merchant_id: beadCredentials.merchant_id || '',
            terminal_id: beadCredentials.terminal_id || '',
            username: beadCredentials.username || '',
            password: '', // Don't pre-fill password for security
            status: beadCredentials.status || 'manual',
            onboarding_status: beadCredentials.onboarding_status || 'NEEDS_INFO'
        });
        setIsEditingBead(true);
        setShowBeadForm(true);
    };

    return (
        <AdminAuthenticatedLayout>
            <Head title="User Details" />
            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
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
                            <div className={`mt-6 p-4 ${hasExistingKeys ? 'bg-green-50' : 'bg-yellow-50'} rounded-lg border border-gray-200`}>
                                <div className="flex md:flex-row flex-col justify-between md:items-center">
                                    <div>
                                        <h3 className="text-md font-medium text-gray-800">
                                            API Keys
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {loadingApiKeys ? 'Loading API keys status...' : 
                                             hasExistingKeys ? 'User can now process payments using the API keys.' : 
                                             'Generate API keys for this merchant to use with payment processing.'}
                                        </p>
                                        {hasExistingKeys && !apiKeys && (
                                            <p className="text-sm text-green-600 mt-1">
                                                This user already has API keys generated.
                                            </p>
                                        )}
                                    </div>
                                    <div className="my-4 md:my-0">
                                        {loadingApiKeys ? (
                                            <div className="text-sm text-gray-600">Loading...</div>
                                        ) : (
                                            <PrimaryButton
                                                type="button"
                                                onClick={generateApiKeys}
                                                disabled={generatingKeys || hasExistingKeys}
                                                className={hasExistingKeys ? "bg-gray-400 cursor-not-allowed" : ""}
                                            >
                                                {generatingKeys ? 'Generating...' : hasExistingKeys ? 'Keys Generated' : 'Generate API Keys'}
                                            </PrimaryButton>
                                        )}
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

                            {/* Add Bead Credentials section */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex md:flex-row flex-col justify-between md:items-center">
                                    <div>
                                        <h3 className="text-md font-medium text-gray-800">
                                            Bead Credentials
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {loadingBeadCredentials ? 'Loading credentials...' :
                                             beadCredentials ? 'User has Bead credentials configured and can now process crypto payments.' : 
                                             'Bead credentials are optional and not configured for this user.'}
                                        </p>
                                    </div>
                                    {!loadingBeadCredentials && !beadCredentials && !showBeadForm && (
                                        <PrimaryButton
                                            type="button"
                                            onClick={() => setShowBeadForm(true)}
                                            className="mt-4 md:mt-0"
                                        >
                                            Add Bead Credentials
                                        </PrimaryButton>
                                    )}
                                </div>

                                {beadCredentialsError && (
                                    <p className="mt-2 text-sm text-red-600">{beadCredentialsError}</p>
                                )}

                                {beadCredentials && (
                                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-medium text-blue-800">Bead Credentials:</h4>
                                            <button
                                                type="button"
                                                onClick={handleEditBead}
                                                className="text-gray-600 hover:text-gray-800 p-1 rounded hover:bg-gray-100"
                                                title="Edit Bead Credentials"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                </svg>
                                            </button>
                                        </div>
                                        <div className="mt-2 space-y-2">
                                            <p className="text-sm">
                                                <strong>Merchant ID:</strong> <code className="bg-blue-100 px-1">{beadCredentials.merchant_id}</code>
                                            </p>
                                            <p className="text-sm">
                                                <strong>Terminal ID:</strong> <code className="bg-blue-100 px-1">{beadCredentials.terminal_id}</code>
                                            </p>
                                            <p className="text-sm">
                                                <strong>Username:</strong> <code className="bg-blue-100 px-1">{beadCredentials.username}</code>
                                            </p>
                                            {/* <p className="text-sm">
                                                <strong>Status:</strong> <span className={`px-2 py-1 rounded text-xs ${
                                                    beadCredentials.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    beadCredentials.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>{beadCredentials.status}</span>
                                            </p>
                                            <p className="text-sm">
                                                <strong>Onboarding Status:</strong> <span className={`px-2 py-1 rounded text-xs ${
                                                    beadCredentials.onboarding_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                    beadCredentials.onboarding_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>{beadCredentials.onboarding_status}</span>
                                            </p> */}
                                        </div>
                                    </div>
                                )}

                                {showBeadForm && (
                                    <form onSubmit={handleBeadSubmit} className="mt-4 space-y-4">
                                        <div>
                                            <InputLabel htmlFor="bead_merchant_id" value="Bead Merchant ID" />
                                            <TextInput
                                                id="bead_merchant_id"
                                                type="text"
                                                className="mt-1 block w-full"
                                                value={beadData.merchant_id}
                                                onChange={(e) => setBeadData('merchant_id', e.target.value)}
                                                required
                                            />
                                            <InputError message={beadErrors.merchant_id} className="mt-2" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="bead_terminal_id" value="Bead Terminal ID" />
                                            <TextInput
                                                id="bead_terminal_id"
                                                type="text"
                                                className="mt-1 block w-full"
                                                value={beadData.terminal_id}
                                                onChange={(e) => setBeadData('terminal_id', e.target.value)}
                                                required
                                            />
                                            <InputError message={beadErrors.terminal_id} className="mt-2" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="bead_username" value="Bead Username" />
                                            <TextInput
                                                id="bead_username"
                                                type="text"
                                                className="mt-1 block w-full"
                                                value={beadData.username}
                                                onChange={(e) => setBeadData('username', e.target.value)}
                                                required
                                            />
                                            <InputError message={beadErrors.username} className="mt-2" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="bead_password" value="Bead Password" />
                                            <div className="relative">
                                                <TextInput
                                                    id="bead_password"
                                                    type={showPassword ? "text" : "password"}
                                                    className="mt-1 block w-full pr-10"
                                                    value={beadData.password}
                                                    onChange={(e) => setBeadData('password', e.target.value)}
                                                    required={!isEditingBead}
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
                                            <InputError message={beadErrors.password} className="mt-2" />
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <PrimaryButton disabled={processingBead}>
                                                {isEditingBead ? 'Update Bead Credentials' : 'Save Bead Credentials'}
                                            </PrimaryButton>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowBeadForm(false);
                                                    setIsEditingBead(false);
                                                }}
                                                className="text-gray-600 hover:text-gray-800"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
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
