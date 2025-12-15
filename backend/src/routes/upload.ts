/**
 * Upload Routes
 * Handles file uploads to R2 storage (headshots, documents, etc.)
 */

import { requireJWT } from '../services/auth';
import { json } from '../services/util';

/**
 * POST /api/v1/upload/headshot
 * Upload a player headshot to R2 and save the URL
 */
export async function handleUploadHeadshot(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        // Parse multipart form data
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const playerId = formData.get('playerId') as string;

        if (!file || !playerId) {
            return json({ success: false, error: { message: 'File and playerId required' } }, 400, corsHdrs);
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return json({ success: false, error: { message: 'Only JPEG, PNG, and WebP images allowed' } }, 400, corsHdrs);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return json({ success: false, error: { message: 'File too large. Max 5MB.' } }, 400, corsHdrs);
        }

        // Verify player belongs to tenant
        const player = await env.DB.prepare(
            'SELECT id FROM players WHERE id = ? AND tenant_id = ?'
        ).bind(playerId, tenantId).first();

        if (!player) {
            return json({ success: false, error: { message: 'Player not found' } }, 404, corsHdrs);
        }

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `headshots/${tenantId}/${playerId}_${Date.now()}.${ext}`;

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await env.R2_BUCKET.put(filename, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            },
        });

        // Get the public URL
        const headshotUrl = `${env.R2_PUBLIC_URL || 'https://media.syston.co'}/${filename}`;

        // Update player record
        await env.DB.prepare(`
            UPDATE players 
            SET headshot_url = ?, headshot_uploaded_at = unixepoch()
            WHERE id = ?
        `).bind(headshotUrl, playerId).run();

        return json({
            success: true,
            data: {
                url: headshotUrl,
                playerId,
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[Upload] Headshot error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * DELETE /api/v1/upload/headshot/:playerId
 * Remove a player's headshot
 */
export async function handleDeleteHeadshot(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const url = new URL(req.url);
        const playerId = url.pathname.split('/').pop();

        // Verify player belongs to tenant
        const player = await env.DB.prepare(
            'SELECT id, headshot_url FROM players WHERE id = ? AND tenant_id = ?'
        ).bind(playerId, tenantId).first();

        if (!player) {
            return json({ success: false, error: { message: 'Player not found' } }, 404, corsHdrs);
        }

        // Delete from R2 if exists
        if (player.headshot_url) {
            const filename = player.headshot_url.split('/').slice(-3).join('/');
            try {
                await env.R2_BUCKET.delete(filename);
            } catch (e) {
                console.warn('[Upload] Failed to delete from R2:', e);
            }
        }

        // Clear URL in database
        await env.DB.prepare(`
            UPDATE players SET headshot_url = NULL, headshot_uploaded_at = NULL WHERE id = ?
        `).bind(playerId).run();

        return json({ success: true }, 200, corsHdrs);
    } catch (error: any) {
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/upload/document
 * Upload a club document (PDF, image) to R2
 */
export async function handleUploadDocument(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const documentId = formData.get('documentId') as string;

        if (!file) {
            return json({ success: false, error: { message: 'File required' } }, 400, corsHdrs);
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return json({ success: false, error: { message: 'Only PDF and image files allowed' } }, 400, corsHdrs);
        }

        // Validate file size (max 10MB for documents)
        if (file.size > 10 * 1024 * 1024) {
            return json({ success: false, error: { message: 'File too large. Max 10MB.' } }, 400, corsHdrs);
        }

        // Generate filename
        const ext = file.name.split('.').pop() || 'pdf';
        const filename = `documents/${tenantId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await env.R2_BUCKET.put(filename, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            },
        });

        const fileUrl = `${env.R2_PUBLIC_URL || 'https://media.syston.co'}/${filename}`;

        // Update document record if documentId provided
        if (documentId) {
            await env.DB.prepare(
                'UPDATE club_documents SET file_url = ?, updated_at = unixepoch() WHERE id = ? AND tenant_id = ?'
            ).bind(fileUrl, documentId, tenantId).run();
        }

        return json({
            success: true,
            data: {
                url: fileUrl,
                filename: file.name,
            }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[Upload] Document error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}

/**
 * POST /api/v1/upload/product-image
 * Upload a product image for shop
 */
export async function handleUploadProductImage(req: Request, env: any, corsHdrs: Headers) {
    try {
        const claims = await requireJWT(req, env);
        const tenantId = claims.tenantId;

        const formData = await req.formData();
        const file = formData.get('file') as File;
        const productId = formData.get('productId') as string;

        if (!file) {
            return json({ success: false, error: { message: 'File required' } }, 400, corsHdrs);
        }

        // Validate image type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return json({ success: false, error: { message: 'Only image files allowed' } }, 400, corsHdrs);
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            return json({ success: false, error: { message: 'File too large. Max 5MB.' } }, 400, corsHdrs);
        }

        // Generate filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `products/${tenantId}/${productId || Date.now()}.${ext}`;

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await env.R2_BUCKET.put(filename, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            },
        });

        const imageUrl = `${env.R2_PUBLIC_URL || 'https://media.syston.co'}/${filename}`;

        // Update product record if productId provided
        if (productId) {
            await env.DB.prepare(
                'UPDATE club_products SET image_url = ? WHERE id = ? AND tenant_id = ?'
            ).bind(imageUrl, productId, tenantId).run();
        }

        return json({
            success: true,
            data: { url: imageUrl }
        }, 200, corsHdrs);
    } catch (error: any) {
        console.error('[Upload] Product image error:', error);
        return json({ success: false, error: { message: error.message } }, 500, corsHdrs);
    }
}
