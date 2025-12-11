'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LinkPlayerModal } from './LinkPlayerModal';

export function TenantSwitcher() {
    const { user, myTenants, switchTenant } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    if (!user) return null;

    // Current tenant is usually inferred from URL, but let's check myTenants
    // If we are strictly on a tenant page URL, we can use that param, but this component might be used globally?
    // Let's assume the navbar passes the current tenant context or we find it.
    // For now, let's just list ALL.

    return (
        <>
            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {user.email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium hidden sm:block truncate max-w-[100px]">
                        My Teams
                    </span>
                    <span className="text-xs">▼</span>
                </button>

                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-40 overflow-hidden">
                            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">My Accounts</p>
                                {myTenants.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No other teams found</p>
                                ) : (
                                    <div className="space-y-1">
                                        {myTenants.map((t) => (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    switchTenant(t.id);
                                                    setIsOpen(false);
                                                }}
                                                className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm flex items-center justify-between"
                                            >
                                                <span>{t.name}</span>
                                                {/* Maybe highlight current? */}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-2">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsLinkModalOpen(true);
                                    }}
                                    className="w-full py-2 px-3 text-sm text-brand font-medium hover:bg-brand/5 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <span>+</span> Link Another Player
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <LinkPlayerModal isOpen={isLinkModalOpen} onClose={() => setIsLinkModalOpen(false)} />
        </>
    );
}
