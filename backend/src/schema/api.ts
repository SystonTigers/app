import { z } from "zod";

export const SignupSchema = z.object({
    clubName: z.string().min(1, "clubName required"),
    clubShortName: z.string().min(1, "clubShortName required"),
    contactEmail: z.string().email("valid email required"),
    contactName: z.string().min(1, "contactName required"),
    locale: z.string().optional(),
    timezone: z.string().optional(),
    plan: z.enum(["free", "managed", "enterprise"]).optional(),
    makeWebhookUrl: z.string().url().optional(),
    promoCode: z.string().optional()
});

export const PostEventSchema = z.object({
    event_type: z.string().min(1, "event_type required"),
    data: z.record(z.unknown()),
    channels: z.array(z.enum(["yt", "fb", "ig", "tiktok", "x"])).optional(),
    template: z.string().optional()
});

export const ValidFixtureStatuses = new Set([
    "scheduled",
    "live",
    "completed",
    "postponed",
    "cancelled"
]);

const FixtureSyncItemSchema = z.object({
    date: z.string().min(1, "date required"),
    homeTeam: z.string().min(1, "homeTeam required"),
    awayTeam: z.string().min(1, "awayTeam required"),
    opponent: z.string().min(1).optional(),
    venue: z.string().optional(),
    competition: z.string().optional(),
    time: z.string().optional(),
    status: z.enum([
        "scheduled",
        "live",
        "completed",
        "postponed",
        "cancelled"
    ]).optional(),
    source: z.string().optional(),
    homeScore: z.union([z.number(), z.string()]).nullable().optional(),
    awayScore: z.union([z.number(), z.string()]).nullable().optional()
});

export const FixtureSyncSchema = z
    .object({
        tenantId: z.string().min(1).optional(),
        tenantSlug: z.string().min(1).optional(),
        fixtures: z.array(FixtureSyncItemSchema)
    })
    .superRefine((value, ctx) => {
        if (!value.tenantId && !value.tenantSlug) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "tenantId or tenantSlug is required"
            });
        }
    })
    .transform((value) => ({
        tenantId: value.tenantId ?? value.tenantSlug!,
        fixtures: value.fixtures
    }));
