'use client';

import { useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    createdAt: number;
}

export function UserManager() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('player');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/v1/admin/users', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'platform_admin': return 'bg-red-100 text-red-800';
            case 'tenant_admin': return 'bg-purple-100 text-purple-800';
            case 'manager': return 'bg-blue-100 text-blue-800';
            case 'player': return 'bg-green-100 text-green-800';
            case 'fan': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="p-8">Loading users...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-brand to-brand/80 text-white p-6 rounded-lg">
                <h2 className="text-2xl font-bold">User Management</h2>
                <p className="text-sm opacity-90">Manage team members and their roles</p>
            </div>

            {/* Invite Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <h3 className="text-lg font-semibold mb-4">Invite New User</h3>
                <div className="flex gap-4">
                    <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Email address"
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                    />
                    <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand dark:bg-gray-700"
                    >
                        <option value="fan">Fan</option>
                        <option value="player">Player</option>
                        <option value="manager">Manager</option>
                        <option value="tenant_admin">Admin</option>
                    </select>
                    <button
                        onClick={() => {/* TODO: implement invite */ }}
                        className="bg-brand text-white px-6 py-2 rounded-lg hover:bg-brand/90 transition-colors"
                    >
                        Send Invite
                    </button>
                </div>
            </div>

            {/* Users List */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Joined
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-brand/20 flex items-center justify-center font-bold text-brand">
                                            {user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium">{user.email}</div>
                                            <div className="text-sm text-gray-500">{user.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                                        {user.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right text-sm">
                                    <button className="text-brand hover:text-brand/80 mr-3">Edit</button>
                                    <button className="text-red-600 hover:text-red-800">Remove</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
