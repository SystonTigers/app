
const API_BASE = 'http://localhost:8787';

async function run() {
    try {
        console.log('Fetching token...');
        const authRes = await fetch(`${API_BASE}/dev/admin-jwt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenantId: 'system' })
        });

        if (!authRes.ok) {
            console.error('Auth failed:', await authRes.text());
            return;
        }

        const authData = await authRes.json();
        console.log('Token received:', authData.token.substring(0, 20) + '...');

        console.log('Fetching promo codes...');
        const statsRes = await fetch(`${API_BASE}/api/v1/admin/promo-codes`, {
            headers: {
                'Authorization': `Bearer ${authData.token}`
            }
        });

        console.log('Stats Status:', statsRes.status);
        const statsText = await statsRes.text();
        console.log('Stats Body:', statsText);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
