/**
 * @fileoverview Produces overlay metadata for match highlight graphics.
 */

var Video = Video || {};

Video.GraphicsGenerator = class {
  constructor(options = {}) {
    this.logger = options.logger || (options.loggerFactory ? options.loggerFactory('VideoGraphics') : logger.scope('VideoGraphics'));
  }

  generate(matchId, matchInfo) {
    this.logger.enterFunction('generateGraphics', { matchId });

    try {
      const graphics = {
        match_clock: this.generateMatchClock(matchInfo),
        player_banners: this.generatePlayerBanners(matchId),
        logo_overlays: this.generateLogoOverlays(matchInfo),
        generated_at: DateUtils.formatISO(DateUtils.now())
      };

      this.logger.exitFunction('generateGraphics', { success: true });
      return graphics;
    } catch (error) {
      this.logger.error('Failed to generate match graphics', { error: error.toString(), matchId });
      throw error;
    }
  }

  generateMatchClock(matchInfo) {
    return {
      type: 'match_clock',
      template: 'standard_clock',
      data: {
        club_name: getConfigValue('SYSTEM.CLUB_SHORT_NAME'),
        opponent: matchInfo.opponent,
        date: matchInfo.date,
        venue: matchInfo.venue
      }
    };
  }

  generatePlayerBanners(_matchId) {
    return [
      {
        type: 'goal_banner',
        template: 'goal_celebration',
        usage: 'goal_clips'
      }
    ];
  }

  generateLogoOverlays(_matchInfo) {
    return {
      type: 'logo_overlay',
      template: 'corner_logo',
      data: {
        club_logo: 'club_logo.png',
        position: 'bottom_right'
      }
    };
  }
};
