
// Using native fetch in Node 18+
const API = 'http://127.0.0.1:8787';

async function run() {
    try {
        // 1. Get Admin Token
        console.log('1. Getting Admin Token...');
        const tokenRes = await fetch(`${API}/dev/admin-jwt`, { method: 'POST' });
        const tokenData = await tokenRes.json();
        if (!tokenData.success) throw new Error('Failed to get token');
        const token = tokenData.token;

        // 2. List Tenants
        console.log('2. Listing Tenants...');
        const tenantsRes = await fetch(`${API}/api/v1/admin/tenants`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!tenantsRes.ok) {
            throw new Error(`Failed to list tenants: ${tenantsRes.status}`);
        }

        const tenantsData = await tenantsRes.json();
        console.log('Tenants found:', tenantsData.tenants.length);
        console.table(tenantsData.tenants.map(t => ({ id: t.id, name: t.name, slug: t.slug })));

        const fs = require('fs');
        fs.writeFileSync('tenants.json', JSON.stringify(tenantsData.tenants, null, 2));
        console.log('Written to tenants.json');

    } catch (e) {
        console.error('Check Failed:', e);
    }
}

run();
