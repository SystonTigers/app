
import { TemplateConfig } from '../types/templates';

export const SOCIAL_TEMPLATES: TemplateConfig[] = [
    // --- Match Day (Square) ---
    {
        id: 'match-day-square',
        name: 'Match Day (Feed)',
        category: 'pre-match',
        format: 'square',
        width: 1080,
        height: 1080,
        backgroundUrl: '/assets/templates/7_Match_Day_league_1080x1080.png',
        overlayElements: [
            { type: 'text', id: 'opponent_name', label: 'Opponent', default: 'Opponent FC', x: 540, y: 400, fontSize: 60, align: 'center', color: '#FFFFFF', font: 'Bold' },
            { type: 'text', id: 'venue', label: 'Venue', default: 'Home Park', x: 540, y: 550, fontSize: 40, align: 'center', color: '#CCCCCC' },
            { type: 'text', id: 'kickoff', label: 'Kick Off', default: '15:00', x: 540, y: 650, fontSize: 80, align: 'center', color: '#FFFFFF', font: 'Bold' },
            { type: 'image', id: 'opponent_logo', label: 'Opponent Logo', x: 540, y: 250, width: 150, height: 150, align: 'center' }
        ]
    },
    // --- Match Day (Story) ---
    {
        id: 'match-day-story',
        name: 'Match Day (Story)',
        category: 'pre-match',
        format: 'story',
        width: 1080,
        height: 1920,
        backgroundUrl: '/assets/templates/30_Match_Day_league_1080x1920.png',
        overlayElements: [
            { type: 'text', id: 'opponent_name', label: 'Opponent', default: 'Opponent FC', x: 540, y: 600, fontSize: 80, align: 'center', color: '#FFFFFF', font: 'Bold' },
            { type: 'text', id: 'venue', label: 'Venue', default: 'Home Park', x: 540, y: 800, fontSize: 50, align: 'center', color: '#E0E0E0' },
            { type: 'text', id: 'kickoff', label: 'Kick Off', default: '15:00', x: 540, y: 1000, fontSize: 120, align: 'center', color: '#FFFFFF', font: 'Heavy' },
            { type: 'image', id: 'opponent_logo', label: 'Opponent Logo', x: 540, y: 300, width: 250, height: 250, align: 'center' }
        ]
    },
    // --- Goal (Square) ---
    {
        id: 'goal-square',
        name: 'Goal!',
        category: 'live',
        format: 'square',
        width: 1080,
        height: 1080,
        backgroundUrl: '/assets/templates/24_Goal_1080x1080.png',
        overlayElements: [
            { type: 'text', id: 'scorer_name', label: 'Scorer', default: 'Player Name', x: 540, y: 800, fontSize: 70, align: 'center', color: '#FFFFFF', font: 'Bold' },
            { type: 'text', id: 'minute', label: 'Minute', default: "00'", x: 540, y: 200, fontSize: 60, align: 'center', color: '#FFFFFF' },
            { type: 'text', id: 'score', label: 'Score', default: '1 - 0', x: 540, y: 540, fontSize: 100, align: 'center', color: '#FFFFFF', font: 'Heavy' }
        ]
    },
    // --- Full Time (Square) ---
    {
        id: 'full-time-square',
        name: 'Full Time Result',
        category: 'post-match',
        format: 'square',
        width: 1080,
        height: 1080,
        backgroundUrl: '/assets/templates/42_Full_time_1080x1080.png',
        overlayElements: [
            { type: 'text', id: 'score_home', label: 'Home Score', default: '0', x: 300, y: 540, fontSize: 150, align: 'center', color: '#FFFFFF', font: 'Heavy' },
            { type: 'text', id: 'score_away', label: 'Away Score', default: '0', x: 780, y: 540, fontSize: 150, align: 'center', color: '#FFFFFF', font: 'Heavy' },
            { type: 'text', id: 'opponent_name', label: 'Opponent', default: 'Opponent', x: 780, y: 700, fontSize: 50, align: 'center', color: '#CCCCCC' }
        ]
    },
    // --- Starting XI (Story) ---
    {
        id: 'starting-xi-story',
        name: 'Starting XI',
        category: 'pre-match',
        format: 'story',
        width: 1080,
        height: 1920,
        backgroundUrl: '/assets/templates/66_Starting_line_up_1080x1920.png',
        overlayElements: [
            { type: 'list', id: 'players', label: 'Lineup', default: ['1. GK', '2. DF', '3. DF'], x: 540, y: 500, fontSize: 45, align: 'center', color: '#FFFFFF', lineHeight: 80 }
        ]
    }
];
