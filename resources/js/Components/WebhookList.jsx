import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

export default function WebhookList() {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchWebhooks = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/webhooks/recent');
            console.log('Webhook response:', response.data);
            setWebhooks(response.data.webhooks);
            setError(null);
        } catch (err) {
            setError('Failed to load webhook data');
            console.error('Error fetching webhooks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWebhooks();
        
        // Set up polling to refresh data every 30 seconds
        const interval = setInterval(fetchWebhooks, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString();
    };

    const clearWebhooks = async () => {
        try {
            await axios.delete('/api/webhooks');
            setWebhooks([]);
            toast.success('Webhooks cleared successfully');
        } catch (err) {
            toast.error('Failed to clear webhooks');
            console.error('Error clearing webhooks:', err);
        }
    };

    if (loading && webhooks.length === 0) {
        return <div className="p-4 text-center">Loading webhook data...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-500">{error}</div>;
    }

    if (webhooks.length === 0) {
        return <div className="p-4 text-center">No webhook data available</div>;
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Recent Webhook Activity</h2>
                <div>
                    <button
                        onClick={fetchWebhooks}
                        className="px-4 py-2 bg-blue-500 text-white rounded mr-2"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={clearWebhooks}
                        className="px-4 py-2 bg-red-500 text-white rounded"
                    >
                        Clear All
                    </button>
                </div>
            </div>
            
            <div className="overflow-auto">
                <table className="min-w-full bg-white border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="py-2 px-4 border">Time</th>
                            <th className="py-2 px-4 border">Type</th>
                            <th className="py-2 px-4 border">Status</th>
                            <th className="py-2 px-4 border">Invoice</th>
                            <th className="py-2 px-4 border">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {webhooks.map((webhook) => (
                            <tr key={webhook.id} className="hover:bg-gray-50">
                                <td className="py-2 px-4 border">{formatDate(webhook.timestamp)}</td>
                                <td className="py-2 px-4 border">{webhook.type}</td>
                                <td className="py-2 px-4 border">
                                    <span className={`inline-block px-2 py-1 rounded text-sm ${
                                        webhook.status === 'processed' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {webhook.status}
                                    </span>
                                </td>
                                <td className="py-2 px-4 border">
                                    {webhook.invoice_id 
                                        ? `#${webhook.invoice_id}` 
                                        : 'N/A'}
                                </td>
                                <td className="py-2 px-4 border">
                                    <details>
                                        <summary className="cursor-pointer text-blue-500">
                                            View Details
                                        </summary>
                                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-60">
                                            {JSON.stringify(webhook.data, null, 2)}
                                        </pre>
                                    </details>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
