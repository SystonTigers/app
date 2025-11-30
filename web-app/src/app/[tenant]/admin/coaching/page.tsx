'use client';

import { use } from 'react';
import AssistantCoach from '@/components/AssistantCoach';

interface PageProps {
    params: Promise<{ tenant: string }>;
}

export default function CoachingPage({ params }: PageProps) {
    const { tenant } = use(params);

    // Get auth token from localStorage
    const getAuthToken = () => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token') || '';
        }
        return '';
    };

    // Get API base URL from environment or default
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto">
                <AssistantCoach
                    apiBaseUrl={apiBaseUrl}
                    authToken={getAuthToken()}
                />
            </div>
        </div>
    );
}
