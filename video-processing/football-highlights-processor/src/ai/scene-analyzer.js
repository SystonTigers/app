import * as tf from '@tensorflow/tfjs-node';
import cv from '@opencv4nodejs';
import fs from 'fs-extra';
import path from 'path';

export class AIAnalyzer {
  constructor(logger) {
    this.logger = logger;
    this.models = {
      actionClassifier: null,
      objectDetector: null,
      audioAnalyzer: null
    };
    this.isInitialized = false;
    this.analysisCache = new Map();

    // Football-specific action thresholds
    this.footballActions = {
      'goal_celebration': { threshold: 0.85, priority: 1, duration: { before: 8, after: 12 } },
      'kicking_soccer_ball': { threshold: 0.80, priority: 2, duration: { before: 6, after: 8 } },
      'heading_soccer_ball': { threshold: 0.75, priority: 2, duration: { before: 5, after: 8 } },
      'goalkeeper_save': { threshold: 0.80, priority: 1, duration: { before: 5, after: 10 } },
      'tackling': { threshold: 0.70, priority: 3, duration: { before: 4, after: 6 } },
      'celebrating': { threshold: 0.65, priority: 2, duration: { before: 3, after: 8 } },
      'crowd_cheering': { threshold: 0.70, priority: 2, duration: { before: 5, after: 8 } },
      'player_down': { threshold: 0.75, priority: 3, duration: { before: 4, after: 8 } },
      'referee_whistle': { threshold: 0.80, priority: 3, duration: { before: 3, after: 5 } },
      'corner_kick': { threshold: 0.70, priority: 4, duration: { before: 5, after: 10 } }
    };

    // Audio analysis parameters
    this.audioConfig = {
      sampleRate: 22050,
      hopLength: 512,
      windowSize: 2048,
      peakThreshold: 0.7,
      celebrationDuration: 3.0
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    this.logger.info('Initializing AI models...');

    try {
      // Load pre-trained models
      await this.loadModels();

      // Initialize OpenCV
      this.initializeCV();

      this.isInitialized = true;
      this.logger.info('AI models initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize AI models', error);
      throw error;
    }
  }

  async loadModels() {
    try {
      // Load MobileNet for general action recognition
      this.logger.info('Loading MobileNet action classifier...');
      this.models.actionClassifier = await tf.loadLayersModel(
        'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
      );

      // Load COCO-SSD for object detection (players, ball, goal posts)
      this.logger.info('Loading COCO-SSD object detector...');
      this.models.objectDetector = await tf.loadGraphModel(
        'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/1/default/1',
        { fromTFHub: true }
      );

      this.logger.info('Models loaded successfully');

    } catch (error) {
      this.logger.warn('Failed to load some models, using fallback methods', error);
      // Initialize with null models - we'll use fallback detection methods
    }
  }

  initializeCV() {
    // Set up OpenCV for video processing
    if (!cv.version) {
      throw new Error('OpenCV not properly installed');
    }

    this.logger.info(`OpenCV version: ${cv.version.major}.${cv.version.minor}.${cv.version.revision}`);
  }

  async analyzeScenes(videoPath, noteData, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    this.logger.info('Starting AI scene analysis', {
      videoPath,
      noteActionsCount: noteData.actions.length,
      options
    });

    const startTime = Date.now();
    const highlights = [];

    try {
      // Open video capture
      const cap = new cv.VideoCapture(videoPath);
      const fps = cap.get(cv.CAP_PROP_FPS);
      const totalFrames = cap.get(cv.CAP_PROP_FRAME_COUNT);
      const duration = totalFrames / fps;

      this.logger.info('Video properties', { fps, totalFrames, duration });

      // Multi-modal analysis
      const analyses = await Promise.all([
        this.performVisualAnalysis(cap, fps, totalFrames, noteData, options),
        this.performAudioAnalysis(videoPath, noteData, options),
        this.performMotionAnalysis(cap, fps, totalFrames, noteData, options)
      ]);

      cap.release();

      // Combine and deduplicate results
      const combinedHighlights = this.combineAnalyses(analyses, noteData);

      // Filter and rank highlights
      const rankedHighlights = this.rankHighlights(combinedHighlights, noteData);

      const processingTime = Date.now() - startTime;
      this.logger.info('AI scene analysis completed', {
        processingTime: `${processingTime}ms`,
        highlightsFound: rankedHighlights.length,
        averageConfidence: rankedHighlights.reduce((sum, h) => sum + h.confidence, 0) / rankedHighlights.length
      });

      return {
        highlights: rankedHighlights,
        statistics: {
          processingTime,
          totalFramesAnalyzed: totalFrames,
          fps,
          duration,
          highlightsFound: rankedHighlights.length
        }
      };

    } catch (error) {
      this.logger.error('AI scene analysis failed', error);
      throw error;
    }
  }

  async performVisualAnalysis(cap, fps, totalFrames, noteData, options) {
    this.logger.info('Performing visual analysis...');

    const highlights = [];
    const frameSkip = Math.max(1, Math.floor(fps / 2)); // Analyze 2 frames per second
    const excludedRegions = this.getExcludedRegions(noteData, 15); // 15-second buffer around known events

    let frameIndex = 0;
    let lastProgressUpdate = 0;

    while (frameIndex < totalFrames) {
      const frame = cap.read();
      if (frame.empty) break;

      const timestamp = frameIndex / fps;

      // Skip if this timestamp is near a known event
      if (!this.isInExcludedRegion(timestamp, excludedRegions)) {

        if (frameIndex % frameSkip === 0) {
          try {
            // Analyze this frame
            const frameAnalysis = await this.analyzeFrame(frame, timestamp);

            if (frameAnalysis.isHighlight) {
              highlights.push({
                startTime: Math.max(0, timestamp - frameAnalysis.duration.before),
                endTime: Math.min(totalFrames / fps, timestamp + frameAnalysis.duration.after),
                timestamp,
                type: frameAnalysis.type,
                confidence: frameAnalysis.confidence,
                source: 'visual',
                details: frameAnalysis.details
              });
            }

          } catch (error) {
            this.logger.warn('Frame analysis failed', { frameIndex, error: error.message });
          }
        }

        // Progress update every 10%
        const progress = Math.floor((frameIndex / totalFrames) * 100);
        if (progress >= lastProgressUpdate + 10) {
          this.logger.info(`Visual analysis progress: ${progress}%`);
          lastProgressUpdate = progress;
        }
      }

      frameIndex++;
    }

    this.logger.info('Visual analysis completed', { highlightsFound: highlights.length });
    return { type: 'visual', highlights };
  }

  async analyzeFrame(frame, timestamp) {
    const cacheKey = `frame_${timestamp}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    try {
      // Convert frame for processing
      const processedFrame = this.preprocessFrame(frame);

      // Multiple analysis approaches
      const analyses = await Promise.all([
        this.detectPlayerActivity(processedFrame),
        this.detectBallMovement(processedFrame),
        this.detectCrowdReaction(processedFrame),
        this.detectGoalAreaActivity(processedFrame)
      ]);

      // Combine results
      const result = this.combineFrameAnalyses(analyses, timestamp);

      // Cache result
      this.analysisCache.set(cacheKey, result);

      // Limit cache size
      if (this.analysisCache.size > 1000) {
        const firstKey = this.analysisCache.keys().next().value;
        this.analysisCache.delete(firstKey);
      }

      return result;

    } catch (error) {
      this.logger.warn('Frame analysis error', { timestamp, error: error.message });
      return { isHighlight: false, confidence: 0, type: 'error' };
    }
  }

  preprocessFrame(frame) {
    try {
      // Resize frame for processing efficiency
      const resized = frame.resize(224, 224);

      // Convert to RGB for TensorFlow models
      const rgb = resized.cvtColor(cv.COLOR_BGR2RGB);

      return rgb;
    } catch (error) {
      this.logger.warn('Frame preprocessing failed', error);
      return frame;
    }
  }

  async detectPlayerActivity(frame) {
    try {
      if (!this.models.actionClassifier) {
        // Fallback: detect motion-based activity
        return this.detectMotionActivity(frame);
      }

      // Convert frame to tensor
      const tensor = tf.browser.fromPixels(frame);
      const batched = tensor.expandDims(0);
      const normalized = batched.div(255.0);

      // Run inference
      const predictions = await this.models.actionClassifier.predict(normalized);
      const scores = await predictions.data();

      // Cleanup tensors
      tensor.dispose();
      batched.dispose();
      normalized.dispose();
      predictions.dispose();

      // Analyze predictions for football actions
      let maxScore = 0;
      let detectedAction = null;

      Object.entries(this.footballActions).forEach(([action, config], index) => {
        const score = scores[index % scores.length];
        if (score > config.threshold && score > maxScore) {
          maxScore = score;
          detectedAction = action;
        }
      });

      return {
        type: 'player_activity',
        detected: detectedAction,
        confidence: maxScore,
        isSignificant: maxScore > 0.7
      };

    } catch (error) {
      this.logger.warn('Player activity detection failed', error);
      return { type: 'player_activity', detected: null, confidence: 0, isSignificant: false };
    }
  }

  detectMotionActivity(frame) {
    try {
      // Simple motion detection as fallback
      const gray = frame.bgrToGray();
      const blurred = gray.gaussianBlur(new cv.Size(21, 21), 0);

      // Store previous frame for comparison (simplified)
      if (!this.previousFrame) {
        this.previousFrame = blurred.copy();
        return { type: 'motion', detected: null, confidence: 0, isSignificant: false };
      }

      // Calculate frame difference
      const frameDiff = blurred.absdiff(this.previousFrame);
      const thresh = frameDiff.threshold(25, 255, cv.THRESH_BINARY);

      // Count non-zero pixels
      const motionPixels = cv.countNonZero(thresh);
      const totalPixels = thresh.rows * thresh.cols;
      const motionRatio = motionPixels / totalPixels;

      // Update previous frame
      this.previousFrame = blurred.copy();

      return {
        type: 'motion',
        detected: motionRatio > 0.1 ? 'high_motion' : 'low_motion',
        confidence: Math.min(motionRatio * 2, 1.0),
        isSignificant: motionRatio > 0.2
      };

    } catch (error) {
      this.logger.warn('Motion detection failed', error);
      return { type: 'motion', detected: null, confidence: 0, isSignificant: false };
    }
  }

  async detectBallMovement(frame) {
    try {
      // Look for circular objects that might be the ball
      const gray = frame.bgrToGray();
      const blurred = gray.medianBlur(5);

      const circles = blurred.houghCircles(
        cv.HOUGH_GRADIENT,
        1,
        gray.rows / 8,
        100,
        30,
        5,
        30
      );

      if (circles.length > 0) {
        // Analyze circle properties to determine if it's likely a ball
        const ballLikeness = this.assessBallLikeness(circles, frame);

        return {
          type: 'ball_movement',
          detected: ballLikeness > 0.5 ? 'ball_detected' : 'possible_ball',
          confidence: ballLikeness,
          isSignificant: ballLikeness > 0.7,
          circles: circles.length
        };
      }

      return { type: 'ball_movement', detected: null, confidence: 0, isSignificant: false };

    } catch (error) {
      this.logger.warn('Ball movement detection failed', error);
      return { type: 'ball_movement', detected: null, confidence: 0, isSignificant: false };
    }
  }

  assessBallLikeness(circles, frame) {
    // Simple heuristic: balls are usually white/light colored and reasonably sized
    let bestScore = 0;

    for (const circle of circles.slice(0, 5)) { // Check up to 5 circles
      const { x, y, radius } = circle;

      // Check if circle is in a reasonable size range for a football
      const sizeScore = radius >= 5 && radius <= 30 ? 1.0 : 0.5;

      // Check color - balls are usually light colored
      const roi = frame.getRegion(new cv.Rect(
        Math.max(0, x - radius),
        Math.max(0, y - radius),
        Math.min(frame.cols - x + radius, radius * 2),
        Math.min(frame.rows - y + radius, radius * 2)
      ));

      const meanColor = roi.mean();
      const brightness = (meanColor[0] + meanColor[1] + meanColor[2]) / 3;
      const colorScore = brightness > 150 ? 1.0 : brightness / 150;

      const overallScore = (sizeScore + colorScore) / 2;
      bestScore = Math.max(bestScore, overallScore);
    }

    return bestScore;
  }

  async detectCrowdReaction(frame) {
    try {
      // Analyze edge regions of frame where crowd would be
      const height = frame.rows;
      const width = frame.cols;

      // Sample regions where crowd typically appears
      const crowdRegions = [
        new cv.Rect(0, 0, width, height * 0.2), // Top
        new cv.Rect(0, height * 0.8, width, height * 0.2), // Bottom
        new cv.Rect(0, 0, width * 0.1, height), // Left
        new cv.Rect(width * 0.9, 0, width * 0.1, height) // Right
      ];

      let totalActivity = 0;
      let regionCount = 0;

      for (const region of crowdRegions) {
        try {
          const roi = frame.getRegion(region);
          const activity = this.measureRegionActivity(roi);
          totalActivity += activity;
          regionCount++;
        } catch (error) {
          // Skip invalid regions
        }
      }

      const averageActivity = regionCount > 0 ? totalActivity / regionCount : 0;

      return {
        type: 'crowd_reaction',
        detected: averageActivity > 0.3 ? 'active_crowd' : 'calm_crowd',
        confidence: Math.min(averageActivity, 1.0),
        isSignificant: averageActivity > 0.5
      };

    } catch (error) {
      this.logger.warn('Crowd reaction detection failed', error);
      return { type: 'crowd_reaction', detected: null, confidence: 0, isSignificant: false };
    }
  }

  measureRegionActivity(roi) {
    try {
      // Measure variance in color/texture as proxy for activity
      const gray = roi.bgrToGray();
      const mean = gray.mean()[0];
      const variance = gray.meanStdDev().stddev[0];

      // Normalize variance to 0-1 range
      return Math.min(variance / 50, 1.0);

    } catch (error) {
      return 0;
    }
  }

  async detectGoalAreaActivity(frame) {
    try {
      // Focus on central areas where goal activity typically occurs
      const height = frame.rows;
      const width = frame.cols;

      const goalAreas = [
        new cv.Rect(width * 0.1, height * 0.3, width * 0.3, height * 0.4), // Left goal area
        new cv.Rect(width * 0.6, height * 0.3, width * 0.3, height * 0.4)  // Right goal area
      ];

      let maxActivity = 0;
      let activeArea = null;

      for (let i = 0; i < goalAreas.length; i++) {
        const area = goalAreas[i];
        const roi = frame.getRegion(area);
        const activity = this.measureGoalAreaActivity(roi);

        if (activity > maxActivity) {
          maxActivity = activity;
          activeArea = i === 0 ? 'left_goal' : 'right_goal';
        }
      }

      return {
        type: 'goal_area_activity',
        detected: maxActivity > 0.4 ? activeArea : null,
        confidence: maxActivity,
        isSignificant: maxActivity > 0.6
      };

    } catch (error) {
      this.logger.warn('Goal area activity detection failed', error);
      return { type: 'goal_area_activity', detected: null, confidence: 0, isSignificant: false };
    }
  }

  measureGoalAreaActivity(roi) {
    try {
      // Look for rectangular shapes (goal posts) and high activity
      const gray = roi.bgrToGray();
      const edges = gray.canny(50, 150);

      // Count edge pixels as proxy for structural activity
      const edgePixels = cv.countNonZero(edges);
      const totalPixels = roi.rows * roi.cols;
      const edgeRatio = edgePixels / totalPixels;

      // Combine with motion/color variation
      const variance = gray.meanStdDev().stddev[0];
      const activityScore = (edgeRatio * 0.6) + (Math.min(variance / 50, 1.0) * 0.4);

      return activityScore;

    } catch (error) {
      return 0;
    }
  }

  combineFrameAnalyses(analyses, timestamp) {
    const significantAnalyses = analyses.filter(a => a.isSignificant);

    if (significantAnalyses.length === 0) {
      return { isHighlight: false, confidence: 0, type: 'no_activity' };
    }

    // Weight different types of analysis
    const weights = {
      'player_activity': 0.4,
      'ball_movement': 0.3,
      'crowd_reaction': 0.2,
      'goal_area_activity': 0.3,
      'motion': 0.1
    };

    let totalWeightedScore = 0;
    let totalWeight = 0;
    let primaryType = 'mixed';
    let maxConfidence = 0;

    for (const analysis of significantAnalyses) {
      const weight = weights[analysis.type] || 0.1;
      totalWeightedScore += analysis.confidence * weight;
      totalWeight += weight;

      if (analysis.confidence > maxConfidence) {
        maxConfidence = analysis.confidence;
        primaryType = analysis.detected || analysis.type;
      }
    }

    const overallConfidence = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

    // Determine if this is a highlight
    const isHighlight = overallConfidence > 0.6 && significantAnalyses.length >= 2;

    if (isHighlight) {
      // Determine appropriate duration based on detected activity
      const duration = this.getDurationForActivity(primaryType);

      return {
        isHighlight: true,
        confidence: overallConfidence,
        type: primaryType,
        duration,
        details: {
          analyses: significantAnalyses,
          combinedScore: overallConfidence,
          timestamp
        }
      };
    }

    return { isHighlight: false, confidence: overallConfidence, type: primaryType };
  }

  getDurationForActivity(activityType) {
    const durations = {
      'goal_celebration': { before: 8, after: 12 },
      'active_crowd': { before: 5, after: 8 },
      'ball_detected': { before: 4, after: 6 },
      'high_motion': { before: 3, after: 5 },
      'left_goal': { before: 6, after: 10 },
      'right_goal': { before: 6, after: 10 }
    };

    return durations[activityType] || { before: 5, after: 8 };
  }

  async performAudioAnalysis(videoPath, noteData, options) {
    this.logger.info('Performing audio analysis...');

    try {
      // Extract audio peaks and crowd noise patterns
      const audioHighlights = await this.extractAudioHighlights(videoPath);

      return {
        type: 'audio',
        highlights: audioHighlights
      };

    } catch (error) {
      this.logger.warn('Audio analysis failed, skipping', error);
      return { type: 'audio', highlights: [] };
    }
  }

  async extractAudioHighlights(videoPath) {
    // Placeholder for audio analysis
    // In a full implementation, this would:
    // 1. Extract audio track using FFmpeg
    // 2. Analyze volume peaks and crowd noise
    // 3. Detect celebration sounds, whistles, etc.

    this.logger.info('Audio analysis not yet implemented, using placeholder');
    return [];
  }

  async performMotionAnalysis(cap, fps, totalFrames, noteData, options) {
    this.logger.info('Performing motion analysis...');

    // Reset video capture for motion analysis
    cap.set(cv.CAP_PROP_POS_FRAMES, 0);

    const motionHighlights = [];
    const frameSkip = Math.floor(fps); // Analyze 1 frame per second for motion
    let previousFrame = null;

    let frameIndex = 0;
    while (frameIndex < totalFrames && frameIndex < fps * 300) { // Limit to 5 minutes for demo
      const frame = cap.read();
      if (frame.empty) break;

      if (frameIndex % frameSkip === 0) {
        const timestamp = frameIndex / fps;
        const motionScore = this.calculateMotionScore(frame, previousFrame);

        if (motionScore > 0.7) { // High motion threshold
          motionHighlights.push({
            startTime: Math.max(0, timestamp - 3),
            endTime: timestamp + 5,
            timestamp,
            type: 'high_motion',
            confidence: Math.min(motionScore, 1.0),
            source: 'motion'
          });
        }

        previousFrame = frame.bgrToGray();
      }

      frameIndex++;
    }

    this.logger.info('Motion analysis completed', { highlightsFound: motionHighlights.length });
    return { type: 'motion', highlights: motionHighlights };
  }

  calculateMotionScore(currentFrame, previousFrame) {
    if (!previousFrame) return 0;

    try {
      const currentGray = currentFrame.bgrToGray();
      const diff = currentGray.absdiff(previousFrame);
      const thresh = diff.threshold(30, 255, cv.THRESH_BINARY);

      const motionPixels = cv.countNonZero(thresh);
      const totalPixels = thresh.rows * thresh.cols;

      return motionPixels / totalPixels;

    } catch (error) {
      return 0;
    }
  }

  combineAnalyses(analyses, noteData) {
    const allHighlights = [];

    // Collect all highlights from different analyses
    for (const analysis of analyses) {
      allHighlights.push(...analysis.highlights);
    }

    // Remove duplicates and overlaps
    return this.deduplicateHighlights(allHighlights);
  }

  deduplicateHighlights(highlights) {
    // Sort by start time
    highlights.sort((a, b) => a.startTime - b.startTime);

    const deduplicated = [];
    const mergeThreshold = 10; // Merge highlights within 10 seconds

    for (const highlight of highlights) {
      const lastHighlight = deduplicated[deduplicated.length - 1];

      if (!lastHighlight || highlight.startTime - lastHighlight.endTime > mergeThreshold) {
        // No overlap, add as new highlight
        deduplicated.push(highlight);
      } else {
        // Overlap detected, merge with previous highlight
        if (highlight.confidence > lastHighlight.confidence) {
          // Replace with higher confidence highlight
          lastHighlight.endTime = Math.max(lastHighlight.endTime, highlight.endTime);
          lastHighlight.confidence = highlight.confidence;
          lastHighlight.type = highlight.type;
          lastHighlight.source = `merged_${lastHighlight.source}_${highlight.source}`;
        } else {
          // Extend duration of existing highlight
          lastHighlight.endTime = Math.max(lastHighlight.endTime, highlight.endTime);
        }
      }
    }

    return deduplicated;
  }

  rankHighlights(highlights, noteData) {
    // Filter out low-confidence highlights
    const filtered = highlights.filter(h => h.confidence > 0.5);

    // Sort by confidence and priority
    return filtered.sort((a, b) => {
      // Primary sort: confidence
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }

      // Secondary sort: source priority (visual > motion > audio)
      const sourcePriority = { visual: 3, motion: 2, audio: 1, merged: 4 };
      const aPriority = sourcePriority[a.source] || 0;
      const bPriority = sourcePriority[b.source] || 0;

      return bPriority - aPriority;
    });
  }

  getExcludedRegions(noteData, bufferSeconds) {
    return noteData.actions.map(action => ({
      start: Math.max(0, action.timestamp - bufferSeconds),
      end: action.timestamp + bufferSeconds
    }));
  }

  isInExcludedRegion(timestamp, excludedRegions) {
    return excludedRegions.some(region =>
      timestamp >= region.start && timestamp <= region.end
    );
  }
}