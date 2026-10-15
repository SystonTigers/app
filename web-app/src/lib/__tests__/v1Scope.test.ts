import { describe, expect, it } from 'vitest';
import { pathShown } from '../v1Scope';
import { clubNav } from '@/components/ui/clubNav';

describe('version 1 scope', () => {
    it('keeps match-day pages and hides shelved ones', () => {
        for (const path of ['/fixtures', '/results', '/table', '/squad', '/stats', '/admin/fixtures', '/admin/settings']) {
            expect(pathShown(path, false)).toBe(true);
        }
        for (const path of ['/training', '/gallery', '/team', '/history', '/admin/gotm', '/admin/lms', '/admin/feed', '/admin/calendar']) {
            expect(pathShown(path, false)).toBe(false);
        }
    });

    it('shows everything again when shelved features are switched back on', () => {
        expect(pathShown('/training', true)).toBe(true);
        expect(pathShown('/admin/gotm', true)).toBe(true);
    });

    it("leaves members' More menu empty and the main links alone", () => {
        const { main, more } = clubNav('syston-tigers', true);
        expect(main.map((i) => i.label)).toEqual(['Home', 'Fixtures', 'Results', 'Table', 'Squad', 'Stats']);
        expect(more).toEqual([]);
    });
});
