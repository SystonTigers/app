import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs-extra';
import { v4 as uuidv4 } from 'uuid';

export class VideoProcessor {
  constructor(logger, storageCoordinator = null) {
    this.logger = logger;
    this.outputDir = '/tmp/output';
    this.tempDir = '/tmp/temp';
    this.storageCoordinator = storageCoordinator;
  }

  async processMatchVideo({
    inputPath,
    matchNotes,
    clubName,
    opponent,
    matchDate,
    manualCuts = [],
    createPlayerHighlights = false,
    noteData,
    sceneAnalysis,
    progressCallback
  }) {
    try {
      this.logger.info('Starting match video processing', {
        inputPath,
        clubName,
        opponent,
        manualCuts: manualCuts.length,
        createPlayerHighlights
      });

      await fs.ensureDir(this.outputDir);
      await fs.ensureDir(this.tempDir);

      const videoInfo = await this.getVideoInfo(inputPath);
      const allHighlights = this.combineHighlights(manualCuts, noteData, sceneAnalysis);

      progressCallback?.(0.1);

      const processedHighlights = await this.processHighlights(
        inputPath,
        allHighlights,
        videoInfo,
        (progress) => progressCallback?.(0.1 + progress * 0.6)
      );

      progressCallback?.(0.7);

      const teamHighlight = await this.createTeamHighlight(
        processedHighlights,
        clubName,
        opponent,
        matchDate
      );

      progressCallback?.(0.8);

      let playerHighlights = [];
      if (createPlayerHighlights) {
        playerHighlights = await this.createPlayerHighlights(
          processedHighlights,
          noteData.players
        );
      }

      progressCallback?.(0.9);

      const stats = this.generateStats(processedHighlights, noteData, sceneAnalysis);

      const result = {
        teamHighlight,
        playerHighlights,
        individualClips: processedHighlights,
        stats,
        metadata: {
          clubName,
          opponent,
          matchDate,
          totalClips: processedHighlights.length,
          totalDuration: processedHighlights.reduce((sum, clip) => sum + clip.duration, 0)
        }
      };

      // Upload to storage if coordinator is available
      if (this.storageCoordinator) {
        try {
          this.logger.info('Uploading highlights to storage services');

          const uploadResults = await this.storageCoordinator.uploadHighlights(result);

          result.uploadResults = uploadResults;
          result.storageUrls = {
            teamHighlight: uploadResults.teamHighlight?.youtube?.url,
            playerHighlights: uploadResults.playerHighlights.map(ph => ({
              player: ph.player,
              url: ph.youtube?.url
            }))
          };

          this.logger.info('Storage upload completed successfully');
        } catch (uploadError) {
          this.logger.error('Storage upload failed', uploadError);
          // Don't fail the entire process if upload fails
          result.uploadError = uploadError.message;
        }
      }

      progressCallback?.(1.0);

      return result;

    } catch (error) {
      this.logger.error('Video processing failed', error);
      throw error;
    }
  }

  combineHighlights(manualCuts, noteData, sceneAnalysis) {
    const highlights = [];

    manualCuts.forEach((cut, index) => {
      highlights.push({
        id: `manual_${index}`,
        type: 'manual',
        startTime: cut.startTime,
        endTime: cut.endTime,
        description: cut.description || `Manual cut ${index + 1}`,
        priority: 10,
        confidence: 1.0,
        source: 'manual'
      });
    });

    noteData.actions.forEach((action, index) => {
      const timing = this.calculateSmartTiming(action, sceneAnalysis);
      highlights.push({
        id: `note_${index}`,
        type: 'note_action',
        startTime: timing.startTime,
        endTime: timing.endTime,
        description: `${action.player} - ${action.action}`,
        player: action.player,
        action: action.action,
        originalTime: action.time,
        priority: this.getActionPriority(action.action),
        confidence: 0.9,
        source: 'match_notes'
      });
    });

    sceneAnalysis.highlights.forEach((highlight, index) => {
      if (highlight.confidence >= 0.6) {
        highlights.push({
          id: `ai_${index}`,
          type: 'ai_detection',
          startTime: highlight.timestamp - 10,
          endTime: highlight.timestamp + 15,
          description: `AI detected: ${highlight.type}`,
          aiType: highlight.type,
          priority: this.getAIPriority(highlight.type),
          confidence: highlight.confidence,
          source: 'ai_analysis'
        });
      }
    });

    return this.deduplicateHighlights(highlights);
  }

  calculateSmartTiming(action, sceneAnalysis) {
    const baseTime = this.parseTimeToSeconds(action.time);
    const actionType = action.action.toLowerCase();

    const timingRules = {
      'goal': { before: 15, after: 10 },
      'penalty': { before: 10, after: 8 },
      'free kick': { before: 8, after: 6 },
      'corner': { before: 5, after: 8 },
      'yellow card': { before: 8, after: 3 },
      'red card': { before: 10, after: 5 },
      'substitution': { before: 3, after: 2 },
      'save': { before: 5, after: 3 },
      'shot': { before: 8, after: 4 },
      'cross': { before: 5, after: 3 },
      'tackle': { before: 3, after: 2 },
      'pass': { before: 3, after: 2 }
    };

    const defaultTiming = { before: 8, after: 5 };
    const timing = timingRules[actionType] || defaultTiming;

    let startTime = Math.max(0, baseTime - timing.before);
    let endTime = baseTime + timing.after;

    const nearbyAI = sceneAnalysis.highlights.filter(h =>
      Math.abs(h.timestamp - baseTime) < 20 && h.confidence > 0.7
    );

    if (nearbyAI.length > 0) {
      const aiHighlight = nearbyAI[0];
      const aiStart = Math.max(0, aiHighlight.timestamp - 12);
      const aiEnd = aiHighlight.timestamp + 8;

      startTime = Math.min(startTime, aiStart);
      endTime = Math.max(endTime, aiEnd);
    }

    return { startTime, endTime };
  }

  async processHighlights(inputPath, highlights, videoInfo, progressCallback) {
    const processed = [];
    const totalHighlights = highlights.length;

    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i];

      try {
        const clipPath = await this.extractClip(inputPath, highlight, i);
        const duration = highlight.endTime - highlight.startTime;

        processed.push({
          ...highlight,
          filePath: clipPath,
          duration,
          fileSize: await this.getFileSize(clipPath)
        });

        progressCallback?.((i + 1) / totalHighlights);

      } catch (error) {
        this.logger.warn(`Failed to process highlight ${i}`, error);
      }
    }

    return processed.sort((a, b) => b.priority - a.priority || b.confidence - a.confidence);
  }

  async extractClip(inputPath, highlight, index) {
    const outputPath = path.join(
      this.outputDir,
      `clip_${index}_${highlight.id}_${Date.now()}.mp4`
    );

    return new Promise((resolve, reject) => {
      const startTime = Math.max(0, highlight.startTime);
      const duration = highlight.endTime - startTime;

      ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(duration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart',
          '-avoid_negative_ts make_zero'
        ])
        .output(outputPath)
        .on('end', () => {
          this.logger.debug(`Clip extracted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (error) => {
          this.logger.error(`Clip extraction failed for ${highlight.id}`, error);
          reject(error);
        })
        .run();
    });
  }

  async createTeamHighlight(highlights, clubName, opponent, matchDate) {
    const outputPath = path.join(
      this.outputDir,
      `${clubName}_vs_${opponent}_${matchDate}_highlights.mp4`
    );

    const sortedHighlights = highlights
      .filter(h => h.filePath && fs.existsSync(h.filePath))
      .slice(0, 15)
      .sort((a, b) => b.priority - a.priority);

    if (sortedHighlights.length === 0) {
      throw new Error('No valid clips to create team highlight');
    }

    return new Promise((resolve, reject) => {
      const ffmpegCommand = ffmpeg();

      sortedHighlights.forEach(highlight => {
        ffmpegCommand.input(highlight.filePath);
      });

      const filterComplex = this.buildTransitionFilter(sortedHighlights);

      ffmpegCommand
        .complexFilter(filterComplex, 'final')
        .outputOptions([
          '-map [final]',
          '-c:v libx264',
          '-c:a aac',
          '-preset medium',
          '-crf 20',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => {
          this.logger.info(`Team highlight created: ${outputPath}`);
          resolve({
            filePath: outputPath,
            type: 'team_highlight',
            clipCount: sortedHighlights.length,
            totalDuration: sortedHighlights.reduce((sum, h) => sum + h.duration, 0)
          });
        })
        .on('error', (error) => {
          this.logger.error('Team highlight creation failed', error);
          reject(error);
        })
        .run();
    });
  }

  async createPlayerHighlights(highlights, players) {
    const playerHighlights = [];

    for (const [playerName, playerData] of players.entries()) {
      const playerClips = highlights.filter(h =>
        h.player && h.player.toLowerCase() === playerName.toLowerCase()
      );

      if (playerClips.length >= 2) {
        try {
          const playerHighlight = await this.createSinglePlayerHighlight(
            playerClips,
            playerName
          );
          playerHighlights.push(playerHighlight);
        } catch (error) {
          this.logger.warn(`Failed to create highlight for ${playerName}`, error);
        }
      }
    }

    return playerHighlights;
  }

  async createSinglePlayerHighlight(clips, playerName) {
    const outputPath = path.join(
      this.outputDir,
      `${playerName.replace(/\s+/g, '_')}_highlights_${Date.now()}.mp4`
    );

    const sortedClips = clips
      .filter(c => c.filePath && fs.existsSync(c.filePath))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);

    return new Promise((resolve, reject) => {
      const ffmpegCommand = ffmpeg();

      sortedClips.forEach(clip => {
        ffmpegCommand.input(clip.filePath);
      });

      const filterComplex = this.buildTransitionFilter(sortedClips);

      ffmpegCommand
        .complexFilter(filterComplex, 'final')
        .outputOptions([
          '-map [final]',
          '-c:v libx264',
          '-c:a aac',
          '-preset fast',
          '-crf 22',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('end', () => {
          resolve({
            player: playerName,
            filePath: outputPath,
            type: 'player_highlight',
            clipCount: sortedClips.length,
            actions: sortedClips.map(c => c.action).filter(Boolean)
          });
        })
        .on('error', reject)
        .run();
    });
  }

  buildTransitionFilter(clips) {
    if (clips.length === 1) {
      return '[0:v][0:a]concat=n=1:v=1:a=1';
    }

    let filter = '';
    for (let i = 0; i < clips.length; i++) {
      filter += `[${i}:v]fade=t=in:st=0:d=0.5,fade=t=out:st=${clips[i].duration - 0.5}:d=0.5[v${i}];`;
      filter += `[${i}:a]afade=t=in:st=0:d=0.5,afade=t=out:st=${clips[i].duration - 0.5}:d=0.5[a${i}];`;
    }

    const videoInputs = clips.map((_, i) => `[v${i}]`).join('');
    const audioInputs = clips.map((_, i) => `[a${i}]`).join('');

    filter += `${videoInputs}concat=n=${clips.length}:v=1:a=0[vout];`;
    filter += `${audioInputs}concat=n=${clips.length}:v=0:a=1[aout];`;
    filter += '[vout][aout]concat=n=1:v=1:a=1';

    return filter;
  }

  deduplicateHighlights(highlights) {
    const deduplicated = [];

    highlights.sort((a, b) => a.startTime - b.startTime);

    for (const highlight of highlights) {
      const overlapping = deduplicated.find(existing =>
        this.getOverlap(existing, highlight) > 5
      );

      if (overlapping) {
        if (highlight.priority > overlapping.priority ||
            (highlight.priority === overlapping.priority && highlight.confidence > overlapping.confidence)) {
          const index = deduplicated.indexOf(overlapping);
          deduplicated[index] = this.mergeHighlights(overlapping, highlight);
        }
      } else {
        deduplicated.push(highlight);
      }
    }

    return deduplicated;
  }

  getOverlap(h1, h2) {
    const start = Math.max(h1.startTime, h2.startTime);
    const end = Math.min(h1.endTime, h2.endTime);
    return Math.max(0, end - start);
  }

  mergeHighlights(h1, h2) {
    return {
      ...h1,
      startTime: Math.min(h1.startTime, h2.startTime),
      endTime: Math.max(h1.endTime, h2.endTime),
      description: `${h1.description} / ${h2.description}`,
      confidence: Math.max(h1.confidence, h2.confidence),
      priority: Math.max(h1.priority, h2.priority),
      sources: [h1.source, h2.source].filter((v, i, a) => a.indexOf(v) === i)
    };
  }

  getActionPriority(action) {
    const priorities = {
      'goal': 10,
      'penalty': 9,
      'red card': 8,
      'yellow card': 7,
      'save': 6,
      'shot': 5,
      'free kick': 4,
      'corner': 3,
      'cross': 2,
      'pass': 1,
      'tackle': 2,
      'substitution': 1
    };

    return priorities[action.toLowerCase()] || 3;
  }

  getAIPriority(type) {
    const priorities = {
      'goal_celebration': 10,
      'penalty_situation': 9,
      'card_shown': 8,
      'goalkeeper_save': 6,
      'shot_attempt': 5,
      'corner_kick': 3,
      'free_kick': 4,
      'crowd_reaction': 2
    };

    return priorities[type] || 3;
  }

  parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;

    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return parseInt(timeStr) || 0;
  }

  async getVideoInfo(inputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) reject(err);
        else resolve({
          duration: metadata.format.duration,
          bitrate: metadata.format.bit_rate,
          size: metadata.format.size,
          streams: metadata.streams
        });
      });
    });
  }

  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  generateStats(highlights, noteData, sceneAnalysis) {
    return {
      processing: {
        totalHighlights: highlights.length,
        manualCuts: highlights.filter(h => h.source === 'manual').length,
        noteBased: highlights.filter(h => h.source === 'match_notes').length,
        aiDetected: highlights.filter(h => h.source === 'ai_analysis').length,
        averageConfidence: highlights.reduce((sum, h) => sum + h.confidence, 0) / highlights.length
      },
      content: {
        totalDuration: highlights.reduce((sum, h) => sum + h.duration, 0),
        actionTypes: [...new Set(highlights.map(h => h.action).filter(Boolean))],
        playersInvolved: [...new Set(highlights.map(h => h.player).filter(Boolean))].length,
        highPriorityClips: highlights.filter(h => h.priority >= 7).length
      },
      ai: {
        totalAnalyzed: sceneAnalysis.highlights.length,
        highConfidenceDetections: sceneAnalysis.highlights.filter(h => h.confidence >= 0.8).length,
        averageConfidence: sceneAnalysis.highlights.reduce((sum, h) => sum + h.confidence, 0) / sceneAnalysis.highlights.length
      }
    };
  }
}