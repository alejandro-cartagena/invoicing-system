import React from 'react';
import { Head } from '@inertiajs/react';
import UserAuthenticatedLayout from '@/Layouts/UserAuthenticatedLayout';
import WebhookList from '@/Components/WebhookList';

export default function Webhooks() {
    return (
        <UserAuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 leading-tight">Webhooks</h2>}
        >
            <Head title="Webhook Activity" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <WebhookList />
                    </div>
                </div>
            </div>
        </UserAuthenticatedLayout>
    );
}
