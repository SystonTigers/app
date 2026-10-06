/**
 * Club Settings (Manager Zone): the same server settings as the website's
 * Admin → Settings. Everything goes through the shared API client, so the
 * club and login are added for us.
 */
import { Platform } from 'react-native';
import { apiClient } from './api';
import type { NameStyle, PostEvents, SnippetKind } from '../utils/clubSettings';

export interface GraphicsPack { id: string; name: string; description: string; premium: boolean; unlocked: boolean }

export interface SocialSettings {
  /** Club admins can change everything; managers and coaches only the name style */
  canManage: boolean;
  nameStyle: NameStyle;
  photos: boolean;
  undoWindow: boolean;
  events: PostEvents;
  connections: { facebook: { id: string; name: string | null } | null; instagram: { id: string; name: string | null } | null };
  /** False until Facebook posting is switched on for Boost Huddle */
  canConnect: boolean;
  /** Facebook Pages waiting to be chosen after connecting from the app */
  pendingChoice: { key: string; pages: Array<{ id: string; name: string; instagram: string | null }> } | null;
  graphics: { pack: string; activePack: string; packs: GraphicsPack[]; sponsorName: string | null; sponsorLogoUrl: string | null };
}

export type FaSnippets = Partial<Record<SnippetKind, string>>;

export interface FixtureEmailInfo {
  address: string | null;
  gmailCode: string | null;
  recent: Array<{ receivedAt: number; subject: string | null; outcome: string; found: number | null; added: number | null; updated: number | null }>;
}

/** A picture chosen from the phone (see components/clubSettings/pickImage). */
export interface PickedImage { uri: string; mimeType: string; blob?: Blob }

const UPLOAD_TIMEOUT = 60000;

/** A form with the picture in it: a real file on the web, the file's address on a phone. */
async function imageForm(field: string, image: PickedImage): Promise<FormData> {
  const form = new FormData();
  const ext = image.mimeType === 'image/png' ? 'png' : 'jpg';
  if (Platform.OS === 'web') {
    form.append(field, image.blob ?? (await (await fetch(image.uri)).blob()), `${field}.${ext}`);
  } else {
    // React Native's FormData takes { uri, name, type } for files
    form.append(field, { uri: image.uri, name: `${field}.${ext}`, type: image.mimeType } as unknown as Blob);
  }
  return form;
}

async function upload<T>(path: string, field: string, image: PickedImage): Promise<T> {
  const response = await apiClient.post(path, await imageForm(field, image), {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
  });
  return response.data.data as T;
}

export const clubSettingsApi = {
  social: async (): Promise<SocialSettings> => (await apiClient.get('/api/v1/social/settings')).data.data,

  /** Club admins: anything; managers: { nameStyle } only. Returns the saved settings. */
  saveSocial: async (body: Partial<{ nameStyle: NameStyle; undoWindow: boolean; events: Partial<PostEvents>; pack: string; sponsorName: string | null }>): Promise<SocialSettings> =>
    (await apiClient.put('/api/v1/social/settings', body)).data.data,

  /** Club admins: show players' photos publicly (only those with consent). */
  savePublicPhotos: async (publicPhotos: boolean): Promise<void> => {
    await apiClient.patch('/api/v1/tenants/me', { publicPhotos });
  },

  /** Facebook's login page; it comes back to a "go back to the app" page. */
  startFacebook: async (): Promise<string> => (await apiClient.post('/api/v1/social/meta/start', { from: 'app' })).data.data.url,
  choosePage: async (key: string, pageId: string): Promise<SocialSettings> =>
    (await apiClient.post('/api/v1/social/meta/select', { key, pageId })).data.data,
  disconnectFacebook: async (): Promise<SocialSettings> => (await apiClient.delete('/api/v1/social/connections/meta')).data.data,

  /** An opponent's badge (Opponents screen), sent the same way as the club badge */
  uploadOpponentBadge: async (opponentId: string, image: PickedImage): Promise<void> => {
    await apiClient.post(`/api/v1/opponents/${encodeURIComponent(opponentId)}/upload-badge`, await imageForm('badge', image), {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });
  },
  uploadBadge: async (image: PickedImage): Promise<string> => (await upload<{ badgeUrl: string }>('/api/v1/club/badge', 'badge', image)).badgeUrl,
  removeBadge: async (): Promise<void> => {
    await apiClient.delete('/api/v1/club/badge');
  },

  uploadSponsorLogo: async (image: PickedImage): Promise<string> =>
    (await upload<{ sponsorLogoUrl: string }>('/api/v1/social/sponsor-logo', 'logo', image)).sponsorLogoUrl,
  removeSponsorLogo: async (): Promise<void> => {
    await apiClient.delete('/api/v1/social/sponsor-logo');
  },

  /** A sample graphic in a style, drawn with the club's own details (JPEG). */
  previewPath: (pack: string, sample: string) => `/api/v1/social/graphics/preview/${encodeURIComponent(pack)}/${encodeURIComponent(sample)}.jpg`,
  /** `version` changes with the badge and sponsor, so the browser doesn't show an old copy. */
  previewBlob: async (pack: string, sample: string, version: string): Promise<Blob> =>
    (await apiClient.get(clubSettingsApi.previewPath(pack, sample), { params: { v: version }, responseType: 'blob', timeout: 30000 })).data,

  faSnippets: async (): Promise<FaSnippets> => (await apiClient.get('/api/v1/club/fa-full-time')).data.data ?? {},
  /** A pasted snippet or its number per kind; "" removes one. */
  saveFaSnippets: async (body: Partial<Record<SnippetKind, string>>): Promise<FaSnippets> =>
    (await apiClient.put('/api/v1/club/fa-full-time', body)).data.data ?? {},

  fixtureEmail: async (): Promise<FixtureEmailInfo> => (await apiClient.get('/api/v1/club/fixture-email')).data.data,
};
