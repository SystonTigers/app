/**
 * @fileoverview Dispatches clip processing jobs to the Make.com workflow.
 */

var Video = Video || {};

Video.ProcessingQueue = class {
  constructor(options = {}) {
    this.logger = options.logger || (options.loggerFactory ? options.loggerFactory('VideoProcessing') : logger.scope('VideoProcessing'));
    this.makeIntegration = options.makeIntegration || new MakeIntegration();
  }

  requestProcessing(clipMetadata) {
    this.logger.enterFunction('requestCloudConvertProcessing', {
      clip_id: clipMetadata ? clipMetadata.clip_id : null,
      event_type: clipMetadata ? clipMetadata.event_type : null
    });

    try {
      const payload = this.buildPayload(clipMetadata);
      const players = [];
      if (clipMetadata && clipMetadata.player && clipMetadata.player !== 'Opposition') {
        players.push({ player: clipMetadata.player });
      }
      const consentContext = {
        module: 'video_clips',
        eventType: payload.event_type,
        platform: 'make_webhook',
        players,
        matchId: clipMetadata && (clipMetadata.match_id || clipMetadata.matchId || null)
      };

      // @testHook(video_clip_consent_start)
      const consentDecision = ConsentGate.evaluatePost(payload, consentContext);
      // @testHook(video_clip_consent_complete)

      if (!consentDecision.allowed) {
        this.logger.warn('Video clip processing blocked by consent gate', {
          clip_id: clipMetadata ? clipMetadata.clip_id : null,
          reason: consentDecision.reason
        });
        this.logger.exitFunction('requestCloudConvertProcessing', {
          success: false,
          blocked: true,
          reason: consentDecision.reason
        });
        return {
          success: false,
          blocked: true,
          reason: consentDecision.reason,
          consent: consentDecision
        };
      }

      const enrichedPayload = ConsentGate.applyDecisionToPayload(payload, consentDecision);

      // @testHook(video_clip_make_start)
      const makeResult = this.makeIntegration.sendToMake(enrichedPayload, {
        consentDecision,
        consentContext,
        idempotencyKey: clipMetadata ? clipMetadata.clip_id : undefined
      });
      // @testHook(video_clip_make_complete)

      this.logger.exitFunction('requestCloudConvertProcessing', {
        success: !!makeResult.success,
        blocked: false
      });

      return {
        ...makeResult,
        consent: consentDecision,
        payload: enrichedPayload
      };
    } catch (error) {
      this.logger.error('CloudConvert processing request failed', {
        error: error.toString(),
        clip_id: clipMetadata ? clipMetadata.clip_id : null
      });

      this.logger.exitFunction('requestCloudConvertProcessing', {
        success: false,
        error: error.toString()
      });
      return {
        success: false,
        error: error.toString()
      };
    }
  }

  buildPayload(clipMetadata) {
    return {
      event_type: getConfigValue('MAKE.EVENT_TYPES.VIDEO_CLIP_PROCESSING', 'video_clip_processing'),
      media_type: 'video_highlights',
      system_version: getConfigValue('SYSTEM.VERSION'),
      club_name: getConfigValue('SYSTEM.CLUB_NAME'),
      clip_id: clipMetadata ? clipMetadata.clip_id : undefined,
      match_id: clipMetadata ? clipMetadata.match_id : undefined,
      player: clipMetadata ? clipMetadata.player : undefined,
      metadata: clipMetadata,
      timestamp: DateUtils.formatISO(DateUtils.now())
    };
  }
};
