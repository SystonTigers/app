'use client';

/** The signed-in person's menu in the club header: their clubs, linking a player and logging out. */
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { clearSession } from '@/lib/session';
import { LinkPlayerModal } from './LinkPlayerModal';
import { Icon } from './ui/Icon';

export function TenantSwitcher() {
    const { user, myTenants, switchTenant, logout } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

    if (!user) return null;

    const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
    const logOut = () => {
        clearSession();
        logout();
    };

    return (
        <>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 p-1 text-gray-300 hover:text-foreground transition-colors"
                    aria-label="Your account"
                    aria-expanded={isOpen}
                >
                    <span className="w-8 h-8 hexagon bg-surface-raised border border-border flex items-center justify-center font-display font-bold text-brand">
                        {initial}
                    </span>
                    <Icon name="chevronDown" className="w-4 h-4 hidden sm:block" />
                </button>

                {isOpen && (
                    <>
                        <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setIsOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border shadow-2xl z-50 chamfer-sm">
                            <div className="p-3 border-b border-border">
                                <p className="text-sm font-semibold truncate">{user.name || user.email}</p>
                                {user.name && <p className="text-xs text-muted truncate">{user.email}</p>}
                            </div>
                            {myTenants.length > 1 && (
                                <div className="p-2 border-b border-border">
                                    <p className="px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted">Your clubs</p>
                                    {myTenants.map((t) => (
                                        <button
                                            type="button"
                                            key={t.id}
                                            onClick={() => {
                                                setIsOpen(false);
                                                void switchTenant(t.id);
                                            }}
                                            className="w-full text-left px-2 py-2 text-sm hover:bg-surface-raised"
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="p-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsLinkModalOpen(true);
                                    }}
                                    className="w-full text-left px-2 py-2 text-sm hover:bg-surface-raised flex items-center gap-2"
                                >
                                    <Icon name="link" className="w-4 h-4 text-brand" /> Link another player
                                </button>
                                <button type="button" onClick={logOut} className="w-full text-left px-2 py-2 text-sm hover:bg-surface-raised flex items-center gap-2">
                                    <Icon name="logout" className="w-4 h-4 text-brand" /> Log out
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
