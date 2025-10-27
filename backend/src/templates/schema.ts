// Template schema and types for SVG rendering system

export type TokenMap = Record<string, string>; // e.g., { TEAM:"Syston Tigers", HS:"2" }

export interface TemplateMeta {
  id: string;                         // "final-score-v1"
  sizes: string[];                    // ["1080x1080","1080x1920"]
  fonts?: {                           // fonts to embed (optional)
    family: string;                   // "Inter"
    files: { name: string; path: string; weight?: number }[]; // in R2 /fonts/
  }[];
  defaults?: TokenMap;                // fallback values for tokens
  colorTokens?: string[];             // ["PRIMARY","BG","TEXT","TEXT_DIM"]
  imageTokens?: string[];             // ["HOME_BADGE","AWAY_BADGE","SPONSOR"]
  textTokens?: string[];              // ["HOME_NAME","AWAY_NAME","SLOGAN","HS","AS"]
}

// Render request payload
export interface RenderRequest {
  templateId: string;                 // template to use
  size: string;                       // "1080x1080"
  theme?: TokenMap;                   // theme color overrides
  data?: TokenMap;                    // data values
  assets?: TokenMap;                  // asset URLs (badges, logos, etc.)
}

// Render response
export interface RenderResponse {
  id: string;                         // render UUID
  url: string;                        // CDN URL to PNG
  bytes: number;                      // file size
  templateId?: string;
  size?: string;
}

// Template pack metadata
export interface TemplatePack {
  id: string;                         // "match-day-pack-v1"
  name: string;                       // "Match Day Graphics"
  description: string;                // "Full-time scores, lineups, countdowns"
  templates: string[];                // ["final-score-v1", "lineup-v1", "countdown-v1"]
  tier: 'free' | 'starter' | 'premium'; // access tier
  previewUrls?: string[];             // preview images
  createdAt: number;
  updatedAt: number;
}

// Template category
export type TemplateCategory =
  | 'match-day'
  | 'player-spotlight'
  | 'team-news'
  | 'celebrations'
  | 'training'
  | 'social'
  | 'custom';

// Extended template metadata with category and tags
export interface TemplateMetaExtended extends TemplateMeta {
  category: TemplateCategory;
  tags: string[];                     // ["goal", "final-score", "result"]
  previewUrl?: string;                // preview image
  tier: 'free' | 'starter' | 'premium';
  createdAt: number;
  updatedAt: number;
}

// Font metadata
export interface FontMeta {
  family: string;                     // "Inter"
  variants: {
    name: string;                     // "Inter-Bold"
    path: string;                     // "Inter-Bold.ttf"
    weight: number;                   // 700
    style: 'normal' | 'italic';
  }[];
  license: string;                    // "OFL" or "proprietary"
  source?: string;                    // download URL
}
