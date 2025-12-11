/**
 * Role-based permissions configuration
 * Defines what each user role can access in the application
 */

export type UserRole = 'manager' | 'coach' | 'parent' | 'player' | 'fan';

export interface Permission {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
}

export interface RolePermissions {
    // Core features
    dashboard: Permission;
    fixtures: Permission;
    results: Permission;
    leagueTable: Permission;

    // Squad management
    squad: Permission;
    playerDetails: Permission;
    playerStats: Permission;

    // Training
    training: Permission;
    trainingRsvp: boolean; // Can respond to training availability
    trainingAttendance: Permission; // Can mark who attended

    // Tactics
    formations: Permission;
    matchPlans: Permission;

    // Media
    videos: Permission;
    gallery: Permission;

    // Communication
    mainChat: boolean;
    coachesChat: boolean;
    playersChat: boolean;
    announcements: Permission;

    // Voting
    gotmVoting: boolean;
    gotmAdmin: Permission;

    // Admin
    teamSettings: Permission;
    userManagement: Permission;
    billing: Permission;
    faIntegration: Permission;

    // Calendar
    calendar: Permission;

    // Stats
    teamStats: Permission;
    careerStats: Permission; // Personal career stats
}

const FULL_ACCESS: Permission = { view: true, create: true, edit: true, delete: true };
const EDIT_ACCESS: Permission = { view: true, create: true, edit: true, delete: false };
const VIEW_ONLY: Permission = { view: true, create: false, edit: false, delete: false };
const NO_ACCESS: Permission = { view: false, create: false, edit: false, delete: false };

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
    manager: {
        // Core - full access
        dashboard: FULL_ACCESS,
        fixtures: FULL_ACCESS,
        results: FULL_ACCESS,
        leagueTable: FULL_ACCESS,

        // Squad - full access
        squad: FULL_ACCESS,
        playerDetails: FULL_ACCESS,
        playerStats: FULL_ACCESS,

        // Training - full access
        training: FULL_ACCESS,
        trainingRsvp: true,
        trainingAttendance: FULL_ACCESS,

        // Tactics - full access
        formations: FULL_ACCESS,
        matchPlans: FULL_ACCESS,

        // Media - full access
        videos: FULL_ACCESS,
        gallery: FULL_ACCESS,

        // Communication - all groups
        mainChat: true,
        coachesChat: true,
        playersChat: true,
        announcements: FULL_ACCESS,

        // Voting
        gotmVoting: true,
        gotmAdmin: FULL_ACCESS,

        // Admin - full access
        teamSettings: FULL_ACCESS,
        userManagement: FULL_ACCESS,
        billing: FULL_ACCESS,
        faIntegration: FULL_ACCESS,

        // Calendar - full access
        calendar: FULL_ACCESS,

        // Stats
        teamStats: FULL_ACCESS,
        careerStats: FULL_ACCESS,
    },

    coach: {
        // Core - can edit
        dashboard: VIEW_ONLY,
        fixtures: EDIT_ACCESS,
        results: EDIT_ACCESS,
        leagueTable: VIEW_ONLY,

        // Squad - can edit players
        squad: EDIT_ACCESS,
        playerDetails: EDIT_ACCESS,
        playerStats: FULL_ACCESS,

        // Training - full access
        training: FULL_ACCESS,
        trainingRsvp: true,
        trainingAttendance: FULL_ACCESS,

        // Tactics - full access
        formations: FULL_ACCESS,
        matchPlans: FULL_ACCESS,

        // Media - full access
        videos: FULL_ACCESS,
        gallery: FULL_ACCESS,

        // Communication - all groups
        mainChat: true,
        coachesChat: true,
        playersChat: true,
        announcements: EDIT_ACCESS,

        // Voting
        gotmVoting: true,
        gotmAdmin: VIEW_ONLY,

        // Admin - no billing/user management
        teamSettings: VIEW_ONLY,
        userManagement: NO_ACCESS,
        billing: NO_ACCESS,
        faIntegration: FULL_ACCESS,

        // Calendar
        calendar: EDIT_ACCESS,

        // Stats
        teamStats: VIEW_ONLY,
        careerStats: VIEW_ONLY,
    },

    parent: {
        // Core - view only
        dashboard: VIEW_ONLY,
        fixtures: VIEW_ONLY,
        results: VIEW_ONLY,
        leagueTable: VIEW_ONLY,

        // Squad - view only, own child's details
        squad: VIEW_ONLY,
        playerDetails: VIEW_ONLY, // Limited to linked player
        playerStats: VIEW_ONLY,   // Limited to linked player

        // Training - can RSVP only
        training: VIEW_ONLY,
        trainingRsvp: true,
        trainingAttendance: NO_ACCESS,

        // Tactics - no access
        formations: NO_ACCESS,
        matchPlans: NO_ACCESS,

        // Media - view only
        videos: VIEW_ONLY,
        gallery: VIEW_ONLY,

        // Communication - main chat only
        mainChat: true,
        coachesChat: false,
        playersChat: false,
        announcements: VIEW_ONLY,

        // Voting
        gotmVoting: true,
        gotmAdmin: NO_ACCESS,

        // Admin - no access
        teamSettings: NO_ACCESS,
        userManagement: NO_ACCESS,
        billing: NO_ACCESS,
        faIntegration: NO_ACCESS,

        // Calendar
        calendar: VIEW_ONLY,

        // Stats
        teamStats: VIEW_ONLY,
        careerStats: VIEW_ONLY, // Own child only
    },

    player: {
        // Core - view only
        dashboard: VIEW_ONLY,
        fixtures: VIEW_ONLY,
        results: VIEW_ONLY,
        leagueTable: VIEW_ONLY,

        // Squad - view only, own stats
        squad: VIEW_ONLY,
        playerDetails: VIEW_ONLY, // Own only
        playerStats: VIEW_ONLY,   // All players (teammates)

        // Training - can RSVP
        training: VIEW_ONLY,
        trainingRsvp: true,
        trainingAttendance: NO_ACCESS,

        // Tactics - view formations assigned to them
        formations: VIEW_ONLY,
        matchPlans: VIEW_ONLY,

        // Media - view only
        videos: VIEW_ONLY,
        gallery: VIEW_ONLY,

        // Communication - players chat only
        mainChat: false,
        coachesChat: false,
        playersChat: true,
        announcements: VIEW_ONLY,

        // Voting
        gotmVoting: true,
        gotmAdmin: NO_ACCESS,

        // Admin - no access
        teamSettings: NO_ACCESS,
        userManagement: NO_ACCESS,
        billing: NO_ACCESS,
        faIntegration: NO_ACCESS,

        // Calendar
        calendar: VIEW_ONLY,

        // Stats
        teamStats: VIEW_ONLY,
        careerStats: VIEW_ONLY, // Own only
    },

    fan: {
        // Core - limited view
        dashboard: NO_ACCESS,
        fixtures: VIEW_ONLY,
        results: VIEW_ONLY,
        leagueTable: VIEW_ONLY,

        // Squad - no access
        squad: NO_ACCESS,
        playerDetails: NO_ACCESS,
        playerStats: NO_ACCESS,

        // Training - no access
        training: NO_ACCESS,
        trainingRsvp: false,
        trainingAttendance: NO_ACCESS,

        // Tactics - no access
        formations: NO_ACCESS,
        matchPlans: NO_ACCESS,

        // Media - view only
        videos: VIEW_ONLY,
        gallery: VIEW_ONLY,

        // Communication - no access
        mainChat: false,
        coachesChat: false,
        playersChat: false,
        announcements: VIEW_ONLY,

        // Voting
        gotmVoting: true,
        gotmAdmin: NO_ACCESS,

        // Admin - no access
        teamSettings: NO_ACCESS,
        userManagement: NO_ACCESS,
        billing: NO_ACCESS,
        faIntegration: NO_ACCESS,

        // Calendar
        calendar: VIEW_ONLY,

        // Stats
        teamStats: NO_ACCESS,
        careerStats: NO_ACCESS,
    },
};

/**
 * Chat group auto-assignment based on role
 */
export const ROLE_CHAT_GROUPS: Record<UserRole, string[]> = {
    manager: ['main', 'coaches', 'players'],
    coach: ['main', 'coaches', 'players'],
    parent: ['main'],
    player: ['players'],
    fan: [],
};

/**
 * Check if a role can access a specific feature
 */
export function canAccess(role: UserRole, feature: keyof RolePermissions, action: keyof Permission = 'view'): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    const featurePermission = permissions[feature];

    if (typeof featurePermission === 'boolean') {
        return featurePermission;
    }

    return (featurePermission as Permission)[action];
}

/**
 * Relationship types for player contacts
 */
export const CONTACT_RELATIONSHIPS = [
    { value: 'mum', label: 'Mum' },
    { value: 'dad', label: 'Dad' },
    { value: 'step-mum', label: 'Step-Mum' },
    { value: 'step-dad', label: 'Step-Dad' },
    { value: 'grandparent', label: 'Grandparent' },
    { value: 'guardian', label: 'Guardian' },
    { value: 'other', label: 'Other' },
] as const;

export type ContactRelationship = typeof CONTACT_RELATIONSHIPS[number]['value'];

/**
 * Generate a unique login code
 * Format: TEAMNAME-XXXX (e.g., TIGERS-8472)
 */
export function generateLoginCode(teamName: string, type: 'player' | 'coach' | 'fan'): string {
    const prefix = teamName.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 7);

    if (type === 'fan') {
        return `${prefix}-FAN`;
    }

    const suffix = type === 'coach' ? 'C' : '';
    const num = Math.random().toString().slice(2, 6);

    return `${prefix}-${suffix}${num}`;
}
