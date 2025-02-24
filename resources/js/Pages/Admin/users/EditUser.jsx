import { useForm, router } from '@inertiajs/react';
import AdminAuthenticatedLayout from '@/Layouts/AdminAuthenticatedLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import PrimaryButton from '@/Components/PrimaryButton';

export default function EditUser({ user }) {
    const { data, setData, patch, processing, errors } = useForm({
        email: user.email,
        business_name: user.business_name,
        address: user.address,
        phone_number: user.phone_number,
        merchant_id: user.merchant_id,
        first_name: user.first_name,
        last_name: user.last_name,
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        patch(route('admin.users.update', user.id), {
            onError: (errors) => {
                console.log('Submission errors:', errors);
            },
            onSuccess: () => {
                console.log('Success!');
            },
        });
    };

    const handleBack = () => {
        router.get(route('admin.users.index'));
    };

    return (
        <AdminAuthenticatedLayout>
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6">
                            <button
                                onClick={handleBack}
                                className="bg-gray-500 text-white px-4 py-1 rounded hover:bg-gray-600 mb-6"
                            >
                                &#8592; Back to Users
                            </button>
                            <h2 className="text-lg font-medium text-gray-900">
                                Edit User
                            </h2>

                            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                                <div>
                                    <InputLabel htmlFor="email" value="Email" />
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
                                    <InputLabel htmlFor="business_name" value="Business Name" />
                                    <TextInput
                                        id="business_name"
                                        type="text"
                                        className="mt-1 block w-full"
                                        value={data.business_name}
                                        onChange={(e) => setData('business_name', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.business_name} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="address" value="Address" />
                                    <TextInput
                                        id="address"
                                        type="text"
                                        className="mt-1 block w-full"
                                        value={data.address}
                                        onChange={(e) => setData('address', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.address} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="phone_number" value="Phone Number" />
                                    <TextInput
                                        id="phone_number"
                                        type="tel"
                                        className="mt-1 block w-full"
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
                                    />
                                    <InputError message={errors.phone_number} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="merchant_id" value="Merchant ID" />
                                    <TextInput
                                        id="merchant_id"
                                        type="text"
                                        className="mt-1 block w-full"
                                        value={data.merchant_id}
                                        onChange={(e) => setData('merchant_id', e.target.value)}
                                        required
                                    />
                                    <InputError message={errors.merchant_id} className="mt-2" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="first_name" value="First Name" />
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
                                    <InputLabel htmlFor="last_name" value="Last Name" />
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

                                <div className="flex items-center gap-4">
                                    <PrimaryButton disabled={processing}>
                                        Update User
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AdminAuthenticatedLayout>
    );
}
