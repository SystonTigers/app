/**
 * Personalization Service
 * Generates merged images (club badge + player name/number) for print-on-demand
 */

import { requireJWT } from '../services/auth';
import { json } from '../services/util';

const PRINTIFY_API_BASE = 'https://api.printify.com/v1';

interface PersonalizationData {
    clubName: string;
    clubBadgeUrl?: string;
    playerName?: string;
    playerNumber?: string;
    customText?: string;
    position: 'front' | 'back';
}

/**
 * Generate SVG design with club badge and player info
 * This creates a vector design that can be uploaded to Printify
 */
export function generatePersonalizedSVG(data: PersonalizationData): string {
    const width = 3000;  // High res for printing
    const height = 3000;

    // Calculate positioning based on what's included
    const hasName = data.playerName && data.playerName.trim();
    const hasNumber = data.playerNumber && data.playerNumber.trim();
    const hasCustomText = data.customText && data.customText.trim();

    let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@700;900&amp;display=swap');
      .player-name { font-family: 'Roboto', sans-serif; font-weight: 900; fill: white; text-anchor: middle; }
      .player-number { font-family: 'Roboto', sans-serif; font-weight: 900; fill: white; text-anchor: middle; }
      .custom-text { font-family: 'Roboto', sans-serif; font-weight: 700; fill: white; text-anchor: middle; }
    </style>
  </defs>
  
  <!-- Background (transparent) -->
  <rect width="${width}" height="${height}" fill="none"/>
`;

    let yPosition = 300;

    // Club badge placeholder (centered at top)
    if (data.clubBadgeUrl) {
        svg += `
  <!-- Club Badge -->
  <image x="${width / 2 - 400}" y="${yPosition}" width="800" height="800" 
         xlink:href="${data.clubBadgeUrl}" preserveAspectRatio="xMidYMid meet"/>
`;
        yPosition += 900;
    }

    // Player name
    if (hasName) {
        svg += `
  <!-- Player Name -->
  <text x="${width / 2}" y="${yPosition}" class="player-name" font-size="200">
    ${escapeXml(data.playerName!.toUpperCase())}
  </text>
`;
        yPosition += 250;
    }

    // Player number
    if (hasNumber) {
        const numberY = hasName ? yPosition : height / 2;
        svg += `
  <!-- Player Number -->
  <text x="${width / 2}" y="${numberY}" class="player-number" font-size="600">
    ${escapeXml(data.playerNumber!)}
  </text>
`;
        yPosition += 650;
    }

    // Custom text (slogan, etc.)
    if (hasCustomText) {
        svg += `
  <!-- Custom Text -->
  <text x="${width / 2}" y="${yPosition}" class="custom-text" font-size="120">
    ${escapeXml(data.customText!)}
  </text>
`;
    }

    svg += `
</svg>`;

    return svg;
}

function escapeXml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Convert SVG to PNG using Cloudflare Workers
 * Note: For production, use a dedicated image service
 */
async function svgToPng(svg: string): Promise<string> {
    // For now, return base64 SVG - Printify accepts SVG
    const base64 = btoa(unescape(encodeURIComponent(svg)));
    return base64;
}

/**
 * POST /api/v1/personalization/generate
 * Generate a personalized design for a product
 */
export async function handleGenerateDesign(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            playerId?: string;
            customName?: string;
            customNumber?: string;
            customText?: string;
            position?: 'front' | 'back';
        };

        // Get club info
        const tenant = await env.DB.prepare(
            'SELECT name, logo_url FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        // Get player info if playerId provided
        let playerName = body.customName || '';
        let playerNumber = body.customNumber || '';

        if (body.playerId) {
            const player = await env.DB.prepare(
                'SELECT name, squad_number FROM players WHERE id = ? AND tenant_id = ?'
            ).bind(body.playerId, tenantId).first();

            if (player) {
                playerName = playerName || player.name || '';
                playerNumber = playerNumber || (player.squad_number?.toString() || '');
            }
        }

        // Generate the design
        const svg = generatePersonalizedSVG({
            clubName: tenant?.name || 'Club',
            clubBadgeUrl: tenant?.logo_url || undefined,
            playerName,
            playerNumber,
            customText: body.customText,
            position: body.position || 'front',
        });

        // Convert to base64
        const base64 = await svgToPng(svg);

        return json({
            success: true,
            data: {
                svgBase64: base64,
                svgData: svg,
                preview: `data:image/svg+xml;base64,${base64}`,
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/personalization/upload-to-printify
 * Upload a generated design to Printify
 */
export async function handleUploadDesignToPrintify(req: Request, env: any, corsHdrs: Headers) {
    try {
        const body = await req.json() as {
            svgBase64: string;
            fileName: string;
        };

        // Upload to Printify
        const response = await fetch(`${PRINTIFY_API_BASE}/uploads/images.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_name: body.fileName || `design_${Date.now()}.svg`,
                contents: body.svgBase64,
            }),
        });

        const data = await response.json();

        return json({ success: true, data }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/personalization/create-order
 * Create a personalized product order
 * This generates the design, uploads to Printify, and creates the order
 */
export async function handleCreatePersonalizedOrder(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const body = await req.json() as {
            shopId: string;
            blueprintId: number;
            printProviderId: number;
            variantId: number;
            quantity: number;
            playerId?: string;
            customName?: string;
            customNumber?: string;
            customText?: string;
            position?: 'front' | 'back';
            customer: {
                firstName: string;
                lastName: string;
                email: string;
                phone?: string;
                address1: string;
                address2?: string;
                city: string;
                region?: string;
                country: string;
                zip: string;
            };
        };

        // 1. Get club info
        const tenant = await env.DB.prepare(
            'SELECT name, logo_url FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        // 2. Get player info if provided
        let playerName = body.customName || '';
        let playerNumber = body.customNumber || '';

        if (body.playerId) {
            const player = await env.DB.prepare(
                'SELECT name, squad_number FROM players WHERE id = ? AND tenant_id = ?'
            ).bind(body.playerId, tenantId).first();

            if (player) {
                playerName = playerName || player.name || '';
                playerNumber = playerNumber || (player.squad_number?.toString() || '');
            }
        }

        // 3. Generate personalized design
        const svg = generatePersonalizedSVG({
            clubName: tenant?.name || 'Club',
            clubBadgeUrl: tenant?.logo_url,
            playerName,
            playerNumber,
            customText: body.customText,
            position: body.position || 'front',
        });

        const base64 = btoa(unescape(encodeURIComponent(svg)));

        // 4. Upload design to Printify
        const uploadRes = await fetch(`${PRINTIFY_API_BASE}/uploads/images.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_name: `order_${Date.now()}_${playerName.replace(/\s+/g, '_')}.svg`,
                contents: base64,
            }),
        });

        const uploadData = await uploadRes.json() as any;

        if (!uploadData.id) {
            throw new Error('Failed to upload design to Printify');
        }

        // 5. Create product with the design
        const productRes = await fetch(`${PRINTIFY_API_BASE}/shops/${body.shopId}/products.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title: `Custom: ${playerName || 'Team'} ${playerNumber ? '#' + playerNumber : ''}`.trim(),
                description: 'Personalized merchandise',
                blueprint_id: body.blueprintId,
                print_provider_id: body.printProviderId,
                variants: [{
                    id: body.variantId,
                    price: 0, // We handle pricing ourselves
                    is_enabled: true,
                }],
                print_areas: [{
                    variant_ids: [body.variantId],
                    placeholders: [{
                        position: body.position || 'front',
                        images: [{
                            id: uploadData.id,
                            x: 0.5,
                            y: 0.5,
                            scale: 1,
                            angle: 0,
                        }],
                    }],
                }],
            }),
        });

        const productData = await productRes.json() as any;

        if (!productData.id) {
            throw new Error('Failed to create product on Printify');
        }

        // 6. Create order
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        const orderRes = await fetch(`${PRINTIFY_API_BASE}/shops/${body.shopId}/orders.json`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.PRINTIFY_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                external_id: orderId,
                line_items: [{
                    product_id: productData.id,
                    variant_id: body.variantId,
                    quantity: body.quantity,
                }],
                shipping_method: 1,
                address_to: {
                    first_name: body.customer.firstName,
                    last_name: body.customer.lastName,
                    email: body.customer.email,
                    phone: body.customer.phone || '',
                    address1: body.customer.address1,
                    address2: body.customer.address2 || '',
                    city: body.customer.city,
                    region: body.customer.region || '',
                    country: body.customer.country,
                    zip: body.customer.zip,
                },
            }),
        });

        const orderData = await orderRes.json();

        return json({
            success: true,
            data: {
                orderId,
                printifyOrderId: (orderData as any).id,
                productId: productData.id,
            }
        }, 201, corsHdrs);
    } catch (error: any) {
        console.error('[Personalization] Order error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * GET /api/v1/personalization/preview/:playerId
 * Get a preview of personalized merchandise for a player
 */
export async function handleGetPlayerPreview(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;
        const url = new URL(req.url);
        const playerId = url.pathname.split('/').pop();

        // Get player info
        const player = await env.DB.prepare(
            'SELECT name, squad_number FROM players WHERE id = ? AND tenant_id = ?'
        ).bind(playerId, tenantId).first();

        if (!player) {
            return json({ success: false, error: { message: 'Player not found' } }, 404, corsHdrs);
        }

        // Get club info
        const tenant = await env.DB.prepare(
            'SELECT name, logo_url FROM tenants WHERE id = ?'
        ).bind(tenantId).first();

        // Generate preview SVG
        const svg = generatePersonalizedSVG({
            clubName: tenant?.name || 'Club',
            clubBadgeUrl: tenant?.logo_url,
            playerName: player.name || '',
            playerNumber: player.squad_number?.toString() || '',
            position: 'front',
        });

        const base64 = btoa(unescape(encodeURIComponent(svg)));

        return json({
            success: true,
            data: {
                player: {
                    name: player.name,
                    number: player.squad_number,
                },
                club: {
                    name: tenant?.name,
                    logo: tenant?.logo_url,
                },
                preview: `data:image/svg+xml;base64,${base64}`,
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
