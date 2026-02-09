// routes/carpool.ts
// Carpool coordinator for away fixtures

import { z } from 'zod';
import { requireJWT } from '../services/auth';
import { json } from '../services/util';
import { logJSON } from '../lib/log';

// Validation schemas
const CreateOfferSchema = z.object({
    seats_available: z.number().min(1).max(8),
    departure_location: z.string().min(1),
    departure_postcode: z.string().optional(),
    departure_time: z.string(), // ISO datetime
    return_offered: z.boolean().default(true),
    notes: z.string().optional(),
});

const RequestSeatSchema = z.object({
    passenger_name: z.string().min(1),
    player_id: z.string().optional(),
    player_name: z.string().optional(),
    seats_needed: z.number().min(1).max(4).default(1),
    pickup_notes: z.string().optional(),
});

const RespondRequestSchema = z.object({
    status: z.enum(['accepted', 'declined']),
});

/**
 * GET /api/v1/fixtures/:fixtureId/carpool
 * List all carpool offers for a fixture
 */
export async function handleGetCarpoolOffers(
    req: Request,
    env: any,
    corsHdrs: Headers,
    fixtureId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const db = env.DB as D1Database;

        // Get all active offers for this fixture
        const offers = await db.prepare(`
      SELECT 
        o.id,
        o.driver_user_id,
        o.driver_name,
        o.seats_available,
        o.seats_taken,
        o.departure_location,
        o.departure_postcode,
        o.departure_time,
        o.return_offered,
        o.notes,
        o.status,
        o.created_at
      FROM carpool_offers o
      WHERE o.fixture_id = ? AND o.tenant_id = ? AND o.status = 'active'
      ORDER BY o.departure_time ASC
    `).bind(fixtureId, tenant).all();

        // Get requests for each offer
        const offersWithRequests = await Promise.all(
            (offers.results || []).map(async (offer: any) => {
                const requests = await db.prepare(`
          SELECT id, passenger_name, player_name, seats_needed, pickup_notes, status
          FROM carpool_requests
          WHERE offer_id = ?
        `).bind(offer.id).all();

                return {
                    ...offer,
                    return_offered: Boolean(offer.return_offered),
                    seats_remaining: offer.seats_available - offer.seats_taken,
                    requests: requests.results || [],
                };
            })
        );

        return json({ success: true, data: offersWithRequests }, 200, corsHdrs);

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to get carpool offers', error: String(err) });
        return json(
            { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch carpool offers' } },
            500,
            corsHdrs
        );
    }
}

/**
 * POST /api/v1/fixtures/:fixtureId/carpool
 * Create a carpool offer (offer a lift)
 */
export async function handleCreateCarpoolOffer(
    req: Request,
    env: any,
    corsHdrs: Headers,
    fixtureId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub || 'unknown';
        const userName = (claims as any).name || (claims as any).email || 'Driver';

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const body = await req.json();
        const validated = CreateOfferSchema.parse(body);
        const db = env.DB as D1Database;

        const id = `carpool-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = Math.floor(Date.now() / 1000);

        await db.prepare(`
      INSERT INTO carpool_offers (
        id, tenant_id, fixture_id, driver_user_id, driver_name,
        seats_available, seats_taken, departure_location, departure_postcode,
        departure_time, return_offered, notes, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
            id,
            tenant,
            fixtureId,
            userId,
            userName,
            validated.seats_available,
            validated.departure_location,
            validated.departure_postcode || null,
            validated.departure_time,
            validated.return_offered ? 1 : 0,
            validated.notes || null,
            now,
            now
        ).run();

        logJSON({ level: 'info', msg: 'Carpool offer created', id, fixtureId, tenant });

        return json(
            { success: true, data: { id, message: 'Lift offer created successfully' } },
            201,
            corsHdrs
        );

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to create carpool offer', error: String(err) });
        return json(
            { success: false, error: { code: 'CREATE_ERROR', message: 'Failed to create carpool offer' } },
            500,
            corsHdrs
        );
    }
}

/**
 * DELETE /api/v1/carpool/offers/:offerId
 * Cancel a carpool offer
 */
export async function handleCancelCarpoolOffer(
    req: Request,
    env: any,
    corsHdrs: Headers,
    offerId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const db = env.DB as D1Database;

        // Only allow driver to cancel their own offer
        const result = await db.prepare(`
      UPDATE carpool_offers 
      SET status = 'cancelled', updated_at = ?
      WHERE id = ? AND tenant_id = ? AND driver_user_id = ?
    `).bind(Math.floor(Date.now() / 1000), offerId, tenant, userId).run();

        if (result.meta.changes === 0) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Offer not found or unauthorized' } },
                404,
                corsHdrs
            );
        }

        // TODO: Send push notification to accepted passengers

        logJSON({ level: 'info', msg: 'Carpool offer cancelled', offerId, tenant });

        return json({ success: true, data: { cancelled: true } }, 200, corsHdrs);

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to cancel carpool offer', error: String(err) });
        return json(
            { success: false, error: { code: 'CANCEL_ERROR', message: 'Failed to cancel offer' } },
            500,
            corsHdrs
        );
    }
}

/**
 * POST /api/v1/carpool/:offerId/request
 * Request a seat in a carpool
 */
export async function handleRequestSeat(
    req: Request,
    env: any,
    corsHdrs: Headers,
    offerId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub || 'unknown';

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const body = await req.json();
        const validated = RequestSeatSchema.parse(body);
        const db = env.DB as D1Database;

        // Check offer exists and has seats
        const offer = await db.prepare(`
      SELECT id, seats_available, seats_taken, driver_user_id
      FROM carpool_offers
      WHERE id = ? AND tenant_id = ? AND status = 'active'
    `).bind(offerId, tenant).first();

        if (!offer) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Offer not found' } },
                404,
                corsHdrs
            );
        }

        const seatsRemaining = (offer.seats_available as number) - (offer.seats_taken as number);
        if (seatsRemaining < validated.seats_needed) {
            return json(
                { success: false, error: { code: 'NO_SEATS', message: 'Not enough seats available' } },
                400,
                corsHdrs
            );
        }

        // Check if user already has a pending request for this offer
        const existingRequest = await db.prepare(`
      SELECT id FROM carpool_requests
      WHERE offer_id = ? AND passenger_user_id = ? AND status IN ('pending', 'accepted')
    `).bind(offerId, userId).first();

        if (existingRequest) {
            return json(
                { success: false, error: { code: 'DUPLICATE', message: 'You already have a request for this lift' } },
                400,
                corsHdrs
            );
        }

        const id = `req-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = Math.floor(Date.now() / 1000);

        await db.prepare(`
      INSERT INTO carpool_requests (
        id, offer_id, tenant_id, passenger_user_id, passenger_name,
        player_id, player_name, seats_needed, pickup_notes, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).bind(
            id,
            offerId,
            tenant,
            userId,
            validated.passenger_name,
            validated.player_id || null,
            validated.player_name || null,
            validated.seats_needed,
            validated.pickup_notes || null,
            now,
            now
        ).run();

        // Send push notification to driver
        await sendCarpoolNotification(
            env,
            tenant,
            offer.driver_user_id as string,
            '🚗 New Seat Request',
            `${validated.passenger_name} has requested ${validated.seats_needed} seat(s) for your lift`,
            { offerId, requestId: id }
        );

        logJSON({ level: 'info', msg: 'Seat request created', id, offerId, tenant });

        return json(
            { success: true, data: { id, message: 'Seat request submitted' } },
            201,
            corsHdrs
        );

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to request seat', error: String(err) });
        return json(
            { success: false, error: { code: 'REQUEST_ERROR', message: 'Failed to request seat' } },
            500,
            corsHdrs
        );
    }
}

/**
 * PATCH /api/v1/carpool/requests/:requestId
 * Accept or decline a seat request (driver only)
 */
export async function handleRespondToRequest(
    req: Request,
    env: any,
    corsHdrs: Headers,
    requestId: string
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const body = await req.json();
        const validated = RespondRequestSchema.parse(body);
        const db = env.DB as D1Database;

        // Get request and verify driver ownership
        const request = await db.prepare(`
      SELECT r.id, r.offer_id, r.seats_needed, o.driver_user_id, o.seats_taken
      FROM carpool_requests r
      JOIN carpool_offers o ON r.offer_id = o.id
      WHERE r.id = ? AND r.tenant_id = ?
    `).bind(requestId, tenant).first();

        if (!request) {
            return json(
                { success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } },
                404,
                corsHdrs
            );
        }

        if (request.driver_user_id !== userId) {
            return json(
                { success: false, error: { code: 'UNAUTHORIZED', message: 'Only the driver can respond' } },
                403,
                corsHdrs
            );
        }

        const now = Math.floor(Date.now() / 1000);

        // Update request status
        await db.prepare(`
      UPDATE carpool_requests SET status = ?, updated_at = ?
      WHERE id = ?
    `).bind(validated.status, now, requestId).run();

        // If accepted, update seats_taken
        if (validated.status === 'accepted') {
            const newSeatsTaken = (request.seats_taken as number) + (request.seats_needed as number);
            await db.prepare(`
        UPDATE carpool_offers SET seats_taken = ?, updated_at = ?
        WHERE id = ?
      `).bind(newSeatsTaken, now, request.offer_id).run();
        }

        // Send push notification to passenger
        const passengerRequest = await db.prepare(`
            SELECT passenger_user_id FROM carpool_requests WHERE id = ?
        `).bind(requestId).first();

        if (passengerRequest?.passenger_user_id) {
            const statusEmoji = validated.status === 'accepted' ? '✅' : '❌';
            const statusText = validated.status === 'accepted' ? 'accepted' : 'declined';
            await sendCarpoolNotification(
                env,
                tenant,
                passengerRequest.passenger_user_id as string,
                `${statusEmoji} Lift Request ${validated.status === 'accepted' ? 'Accepted' : 'Declined'}`,
                `Your seat request has been ${statusText}`,
                { requestId, status: validated.status }
            );
        }

        logJSON({ level: 'info', msg: 'Request responded', requestId, status: validated.status, tenant });

        return json(
            { success: true, data: { status: validated.status } },
            200,
            corsHdrs
        );

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to respond to request', error: String(err) });
        return json(
            { success: false, error: { code: 'RESPOND_ERROR', message: 'Failed to respond to request' } },
            500,
            corsHdrs
        );
    }
}

/**
 * GET /api/v1/carpool/my-offers
 * Get current user's carpool offers
 */
export async function handleGetMyOffers(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const db = env.DB as D1Database;

        const offers = await db.prepare(`
      SELECT 
        o.*,
        f.opponent,
        f.fixture_date
      FROM carpool_offers o
      LEFT JOIN fixtures f ON o.fixture_id = f.id
      WHERE o.driver_user_id = ? AND o.tenant_id = ?
      ORDER BY o.created_at DESC
      LIMIT 20
    `).bind(userId, tenant).all();

        return json({ success: true, data: offers.results || [] }, 200, corsHdrs);

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to get my offers', error: String(err) });
        return json(
            { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch your offers' } },
            500,
            corsHdrs
        );
    }
}

/**
 * GET /api/v1/carpool/my-requests
 * Get current user's seat requests
 */
export async function handleGetMyRequests(
    req: Request,
    env: any,
    corsHdrs: Headers
): Promise<Response> {
    try {
        const claims = await requireJWT(req, env);
        const tenant = claims.tenantId;
        const userId = (claims as any).userId || claims.sub;

        if (!tenant) {
            return json(
                { success: false, error: { code: 'MISSING_TENANT', message: 'Tenant not found' } },
                400,
                corsHdrs
            );
        }

        const db = env.DB as D1Database;

        const requests = await db.prepare(`
      SELECT 
        r.*,
        o.driver_name,
        o.departure_location,
        o.departure_time,
        f.opponent,
        f.fixture_date
      FROM carpool_requests r
      JOIN carpool_offers o ON r.offer_id = o.id
      LEFT JOIN fixtures f ON o.fixture_id = f.id
      WHERE r.passenger_user_id = ? AND r.tenant_id = ?
      ORDER BY r.created_at DESC
      LIMIT 20
    `).bind(userId, tenant).all();

        return json({ success: true, data: requests.results || [] }, 200, corsHdrs);

    } catch (err) {
        logJSON({ level: 'error', msg: 'Failed to get my requests', error: String(err) });
        return json(
            { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch your requests' } },
            500,
            corsHdrs
        );
    }
}

/**
 * Send push notification to a user for carpool events
 */
async function sendCarpoolNotification(
    env: any,
    tenantId: string,
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<void> {
    try {
        const db = env.DB as D1Database;

        // Store as scheduled notification for immediate delivery
        const id = `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await db.prepare(`
            INSERT INTO scheduled_notifications (
                id, tenant_id, user_id, notification_type,
                title, body, data, scheduled_for, created_at
            ) VALUES (?, ?, ?, 'carpool', ?, ?, ?, ?, ?)
        `).bind(
            id,
            tenantId,
            userId,
            title,
            body,
            data ? JSON.stringify(data) : null,
            Date.now(), // Immediate
            Date.now()
        ).run();

        logJSON({ level: 'info', msg: 'Carpool notification scheduled', id, userId });
    } catch (err) {
        // Don't fail the main request if notifications fail
        logJSON({ level: 'warn', msg: 'Failed to schedule carpool notification', error: String(err) });
    }
}
