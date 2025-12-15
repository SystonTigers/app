'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface SubscriptionPlan {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    frequency: string;
    billingDay: number;
    startDate: number | null;
    endDate: number | null;
    status: string;
    subscriberCount: number;
}

interface RegistrationFee {
    id: string;
    name: string;
    description: string | null;
    amount: number;
    season: string | null;
    isMandatory: boolean;
    paidCount: number;
}

interface ClubDocument {
    id: string;
    title: string;
    description: string | null;
    requiresSignature: boolean;
    requiredForRegistration: boolean;
    signatureCount: number;
}

interface Discount {
    id: string;
    name: string;
    description: string | null;
    discountType: string;
    discountValue: number;
    appliesTo: string;
}

interface StaffChild {
    id: string;
    staffEmail: string;
    playerId: string;
    playerName: string;
    relationship: string;
}

export default function RegistrationSettingsPage() {
    const params = useParams();
    const tenant = params?.tenant as string;
    const [activeTab, setActiveTab] = useState<'plans' | 'fees' | 'documents' | 'discounts'>('plans');
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [fees, setFees] = useState<RegistrationFee[]>([]);
    const [documents, setDocuments] = useState<ClubDocument[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [staffChildren, setStaffChildren] = useState<StaffChild[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showFeeModal, setShowFeeModal] = useState(false);
    const [showDocModal, setShowDocModal] = useState(false);
    const [showDiscountModal, setShowDiscountModal] = useState(false);

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [plansRes, feesRes, docsRes, discountsRes, staffRes] = await Promise.all([
                fetch(`${API_BASE}/api/v1/registration/plans`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/registration/fees`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/registration/documents`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/registration/discounts`, { credentials: 'include' }),
                fetch(`${API_BASE}/api/v1/registration/staff-children`, { credentials: 'include' }),
            ]);

            const [plansData, feesData, docsData, discountsData, staffData] = await Promise.all([
                plansRes.json(),
                feesRes.json(),
                docsRes.json(),
                discountsRes.json(),
                staffRes.json(),
            ]);

            if (plansData.success) setPlans(plansData.data);
            if (feesData.success) setFees(feesData.data);
            if (docsData.success) setDocuments(docsData.data);
            if (discountsData.success) setDiscounts(discountsData.data);
            if (staffData.success) setStaffChildren(staffData.data);
        } catch (error) {
            console.error('Failed to fetch registration data:', error);
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'plans', label: 'Subscription Plans', icon: '🔄' },
        { id: 'fees', label: 'Registration Fees', icon: '💳' },
        { id: 'documents', label: 'Club Documents', icon: '📄' },
        { id: 'discounts', label: 'Discounts', icon: '🏷️' },
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Registration Settings</h1>
                <p className="text-gray-600 mt-1">Manage subscriptions, fees, documents, and discounts</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Subscription Plans Tab */}
            {activeTab === 'plans' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-900">Recurring Subscription Plans</h2>
                            <p className="text-sm text-gray-500">Set up automatic monthly payments</p>
                        </div>
                        <button
                            onClick={() => setShowPlanModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add Plan
                        </button>
                    </div>
                    {plans.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">🔄</div>
                            <p>No subscription plans yet. Create one to auto-collect monthly subs.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {plans.map((plan) => (
                                <div key={plan.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{plan.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            £{plan.amount.toFixed(2)} / {plan.frequency} • {plan.subscriberCount} subscribers
                                        </p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {plan.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Registration Fees Tab */}
            {activeTab === 'fees' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-900">One-Off Registration Fees</h2>
                            <p className="text-sm text-gray-500">Season signing-on fees and registration</p>
                        </div>
                        <button
                            onClick={() => setShowFeeModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add Fee
                        </button>
                    </div>
                    {fees.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">💳</div>
                            <p>No registration fees set up. Create a signing-on fee for new players.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {fees.map((fee) => (
                                <div key={fee.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{fee.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            £{fee.amount.toFixed(2)} • {fee.paidCount} paid
                                            {fee.season && ` • ${fee.season}`}
                                        </p>
                                    </div>
                                    {fee.isMandatory && (
                                        <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                            Required
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Club Documents Tab */}
            {activeTab === 'documents' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="font-semibold text-gray-900">Club Documents</h2>
                            <p className="text-sm text-gray-500">Rules, code of conduct, policies</p>
                        </div>
                        <button
                            onClick={() => setShowDocModal(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            + Add Document
                        </button>
                    </div>
                    {documents.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="text-4xl mb-2">📄</div>
                            <p>No documents yet. Add your club rules and code of conduct.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {documents.map((doc) => (
                                <div key={doc.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{doc.title}</h3>
                                        <p className="text-sm text-gray-500">
                                            {doc.signatureCount} signatures
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {doc.requiresSignature && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                                                ✍️ Signature Required
                                            </span>
                                        )}
                                        {doc.requiredForRegistration && (
                                            <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                                Required for Registration
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Discounts Tab */}
            {activeTab === 'discounts' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-semibold text-gray-900">Discount Rules</h2>
                                <p className="text-sm text-gray-500">Coach discounts, volunteer perks, sibling rates</p>
                            </div>
                            <button
                                onClick={() => setShowDiscountModal(true)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                + Add Discount
                            </button>
                        </div>
                        {discounts.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <div className="text-4xl mb-2">🏷️</div>
                                <p>No discounts set up. Add discounts for coaches' children, volunteers, etc.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {discounts.map((discount) => (
                                    <div key={discount.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{discount.name}</h3>
                                            <p className="text-sm text-gray-500">
                                                {discount.discountType === 'free' ? 'Free' :
                                                    discount.discountType === 'percentage' ? `${discount.discountValue}% off` :
                                                        `£${discount.discountValue.toFixed(2)} off`}
                                                {' • '}Applies to: {discount.appliesTo.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Staff Children Links */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900">Coach/Volunteer Children</h2>
                            <p className="text-sm text-gray-500">Players linked to staff for discount eligibility</p>
                        </div>
                        {staffChildren.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <p>No staff-child links yet. Link coaches to their children to apply discounts.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {staffChildren.map((link) => (
                                    <div key={link.id} className="p-4 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-medium text-gray-900">{link.playerName}</h3>
                                            <p className="text-sm text-gray-500">
                                                {link.relationship} of {link.staffEmail}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
