// backend/src/services/socialAgent.ts
// AI-powered social media posting agent using Google Gemini

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Env } from '../types';

export interface SocialPost {
  content: string;
  media?: string[];
  platforms: ('twitter' | 'instagram' | 'facebook' | 'tiktok')[];
}

export interface PlatformConfig {
  enabled: boolean;
  credentials?: {
    accessToken?: string;
    refreshToken?: string;
  };
}

export interface TenantSocialConfig {
  twitter?: PlatformConfig;
  instagram?: PlatformConfig;
  facebook?: PlatformConfig;
  tiktok?: PlatformConfig;
}

export interface SocialPostResult {
  platform: string;
  success: boolean;
  formattedContent?: string;
  error?: string;
}

// Usage limits per plan (free tier focused)
export interface PlanLimits {
  daily: number;
  monthly: number;
}

export const SOCIAL_LIMITS: Record<string, PlanLimits> = {
  starter: { daily: 5, monthly: 150 },      // 5 posts/day
  pro: { daily: 20, monthly: 600 },         // 20 posts/day
  enterprise: { daily: 50, monthly: 1500 }, // 50 posts/day
};

/**
 * Check if tenant can post based on usage limits
 */
export async function canPost(
  tenantId: string,
  plan: string,
  env: Env
): Promise<{ allowed: boolean; reason?: string; usage?: { daily: number; monthly: number } }> {
  const limits = SOCIAL_LIMITS[plan] || SOCIAL_LIMITS.starter;

  // Check daily usage
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `social-usage:${tenantId}:daily:${today}`;
  const dailyUsageStr = await env.KV.get(dailyKey);
  const dailyUsage = dailyUsageStr ? parseInt(dailyUsageStr) : 0;

  if (dailyUsage >= limits.daily) {
    return {
      allowed: false,
      reason: `Daily limit reached (${dailyUsage}/${limits.daily})`,
      usage: { daily: dailyUsage, monthly: 0 },
    };
  }

  // Check monthly usage
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthlyKey = `social-usage:${tenantId}:monthly:${month}`;
  const monthlyUsageStr = await env.KV.get(monthlyKey);
  const monthlyUsage = monthlyUsageStr ? parseInt(monthlyUsageStr) : 0;

  if (monthlyUsage >= limits.monthly) {
    return {
      allowed: false,
      reason: `Monthly limit reached (${monthlyUsage}/${limits.monthly})`,
      usage: { daily: dailyUsage, monthly: monthlyUsage },
    };
  }

  return {
    allowed: true,
    usage: { daily: dailyUsage, monthly: monthlyUsage },
  };
}

/**
 * Increment usage counters after successful post
 */
export async function incrementUsage(tenantId: string, env: Env): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const month = new Date().toISOString().slice(0, 7);

  // Increment daily counter
  const dailyKey = `social-usage:${tenantId}:daily:${today}`;
  const dailyUsageStr = await env.KV.get(dailyKey);
  const dailyUsage = dailyUsageStr ? parseInt(dailyUsageStr) : 0;
  await env.KV.put(dailyKey, (dailyUsage + 1).toString(), {
    expirationTtl: 86400 * 2, // Keep for 2 days
  });

  // Increment monthly counter
  const monthlyKey = `social-usage:${tenantId}:monthly:${month}`;
  const monthlyUsageStr = await env.KV.get(monthlyKey);
  const monthlyUsage = monthlyUsageStr ? parseInt(monthlyUsageStr) : 0;
  await env.KV.put(monthlyKey, (monthlyUsage + 1).toString(), {
    expirationTtl: 86400 * 60, // Keep for 60 days
  });
}

/**
 * Social Media Agent powered by Google Gemini
 */
export class SocialAgent {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
    });
  }

  /**
   * Format a post for multiple social media platforms
   * Uses AI to adapt content for each platform's style and requirements
   */
  async formatPost(post: SocialPost): Promise<Record<string, string>> {
    const hasMedia = post.media && post.media.length > 0;

    const prompt = `You're a social media manager for grassroots sports teams (football, soccer, etc.).

Task: Format this post for each requested platform with appropriate style, length, and hashtags.

Original post: "${post.content}"
Has media: ${hasMedia ? 'Yes (images/video attached)' : 'No'}
Target platforms: ${post.platforms.join(', ')}

Platform guidelines:
- Twitter/X: Max 280 chars, casual, 2-3 hashtags, emojis OK
- Instagram: Engaging caption, emojis encouraged, 5-10 hashtags at end, can be longer
- Facebook: Family-friendly, detailed OK, 1-2 hashtags, professional tone
- TikTok: Youth-focused, energetic, trending style, 3-5 hashtags, lots of emojis

Return ONLY the formatted content for each platform in this exact format:
twitter: [content]
instagram: [content]
facebook: [content]
tiktok: [content]

Include only the platforms requested. Keep the core message but adapt tone/style/length/hashtags for each platform.`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Parse AI response into platform-specific content
      const formatted: Record<string, string> = {};

      for (const platform of post.platforms) {
        const regex = new RegExp(`${platform}:\\s*(.+?)(?=\\n(?:twitter|instagram|facebook|tiktok):|$)`, 'is');
        const match = text.match(regex);

        if (match && match[1]) {
          formatted[platform] = match[1].trim();
        } else {
          // Fallback: use original content if parsing fails
          console.warn(`Failed to parse ${platform} content, using original`);
          formatted[platform] = post.content;
        }
      }

      return formatted;
    } catch (error: any) {
      console.error('Gemini formatting error:', error);

      // Fallback: return original content for all platforms
      const fallback: Record<string, string> = {};
      for (const platform of post.platforms) {
        fallback[platform] = post.content;
      }
      return fallback;
    }
  }

  /**
   * Post to social media platforms
   * Currently logs formatted content - actual posting will be implemented per platform
   */
  async postToPlatforms(
    formattedContent: Record<string, string>,
    media: string[] | undefined,
    config: TenantSocialConfig
  ): Promise<SocialPostResult[]> {
    const results: SocialPostResult[] = [];

    for (const [platform, content] of Object.entries(formattedContent)) {
      const platformConfig = config[platform as keyof TenantSocialConfig];

      // Check if platform is enabled
      if (!platformConfig?.enabled) {
        results.push({
          platform,
          success: false,
          error: 'Platform not enabled',
        });
        continue;
      }

      try {
        // TODO: Implement actual posting logic per platform
        // For now, just log and mark as success
        console.log(`[SOCIAL AGENT] Would post to ${platform}:`, content);
        if (media && media.length > 0) {
          console.log(`[SOCIAL AGENT] With media:`, media);
        }

        results.push({
          platform,
          success: true,
          formattedContent: content,
        });
      } catch (error: any) {
        console.error(`[SOCIAL AGENT] Error posting to ${platform}:`, error);
        results.push({
          platform,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

/**
 * Create a social agent instance
 */
export function createSocialAgent(apiKey: string): SocialAgent {
  return new SocialAgent(apiKey);
}
