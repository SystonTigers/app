import Queue from 'bull';
import winston from 'winston';
import { VideoProcessor } from './processors/video-processor.js';
import { MatchNotesParser } from './parsers/match-notes-parser.js';
import { AIAnalyzer } from './ai/scene-analyzer.js';
import { DriveManager } from './storage/drive-manager.js';
import { HealthMonitor } from './monitoring/health-monitor.js';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/worker.log' })
  ]
});

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY) || 2;

const videoQueue = new Queue('video processing', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    }
  }
});

const videoProcessor = new VideoProcessor(logger);
const notesParser = new MatchNotesParser(logger);
const aiAnalyzer = new AIAnalyzer(logger);
const driveManager = new DriveManager(logger);
const healthMonitor = new HealthMonitor(logger);

videoQueue.process('process-match', WORKER_CONCURRENCY, async (job) => {
  const jobId = job.id;
  const startTime = Date.now();

  try {
    logger.info('Worker processing job', {
      jobId,
      workerId: process.pid,
      data: {
        clubName: job.data.clubName,
        opponent: job.data.opponent,
        matchDate: job.data.matchDate
      }
    });

    job.progress(5);
    await job.update({ status: 'initializing', workerId: process.pid });

    let inputPath;
    if (job.data.videoUrl) {
      logger.info('Downloading video from Google Drive', { jobId });
      await job.update({ status: 'downloading' });
      inputPath = await driveManager.downloadVideo(job.data.videoUrl);
      job.progress(15);
    } else {
      inputPath = job.data.videoPath;
    }

    if (!inputPath) {
      throw new Error('No video path provided');
    }

    logger.info('Parsing match notes', { jobId });
    await job.update({ status: 'parsing_notes' });
    const noteData = await notesParser.parseMatchNotes(job.data.matchNotes || '');
    job.progress(25);

    logger.info('Match notes parsed', {
      jobId,
      actions: noteData.actions.length,
      players: noteData.players.size
    });

    logger.info('Starting AI scene analysis', { jobId });
    await job.update({ status: 'ai_analysis' });
    const sceneAnalysis = await aiAnalyzer.analyzeScenes(inputPath, noteData, {
      progressCallback: (progress) => {
        job.progress(25 + (progress * 25));
      }
    });
    job.progress(50);

    logger.info('AI analysis completed', {
      jobId,
      aiHighlights: sceneAnalysis.highlights.length,
      averageConfidence: sceneAnalysis.highlights.reduce((sum, h) => sum + h.confidence, 0) / sceneAnalysis.highlights.length
    });

    logger.info('Processing video highlights', { jobId });
    await job.update({ status: 'processing_highlights' });
    const result = await videoProcessor.processMatchVideo({
      inputPath,
      matchNotes: job.data.matchNotes,
      clubName: job.data.clubName,
      opponent: job.data.opponent,
      matchDate: job.data.matchDate,
      manualCuts: job.data.manualCuts || [],
      createPlayerHighlights: job.data.createPlayerHighlights || false,
      noteData,
      sceneAnalysis,
      progressCallback: (progress) => {
        job.progress(50 + (progress * 30));
      }
    });
    job.progress(80);

    logger.info('Video processing completed, uploading results', {
      jobId,
      teamHighlight: !!result.teamHighlight,
      playerHighlights: result.playerHighlights.length,
      individualClips: result.individualClips.length
    });

    await job.update({ status: 'uploading' });
    const uploadResults = await driveManager.uploadResults(result, {
      clubName: job.data.clubName,
      opponent: job.data.opponent,
      matchDate: job.data.matchDate
    });
    job.progress(95);

    if (job.data.notificationUrl) {
      logger.info('Sending completion notification', { jobId });
      try {
        await fetch(job.data.notificationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            status: 'completed',
            result: uploadResults,
            processingTime: Date.now() - startTime,
            stats: result.stats
          })
        });
      } catch (notifyError) {
        logger.warn('Notification failed', { jobId, error: notifyError.message });
      }
    }

    if (job.data.videoUrl && inputPath) {
      await driveManager.cleanup();
    }

    job.progress(100);

    const processingTime = Date.now() - startTime;
    logger.info('Job completed successfully', {
      jobId,
      processingTime: `${Math.round(processingTime / 1000)}s`,
      workerId: process.pid
    });

    return {
      ...uploadResults,
      processingTime,
      workerId: process.pid,
      stats: result.stats
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Job processing failed', {
      jobId,
      error: error.message,
      stack: error.stack,
      processingTime: `${Math.round(processingTime / 1000)}s`,
      workerId: process.pid
    });

    if (job.data.notificationUrl) {
      try {
        await fetch(job.data.notificationUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobId,
            status: 'failed',
            error: error.message,
            processingTime,
            workerId: process.pid
          })
        });
      } catch (notifyError) {
        logger.warn('Error notification failed', { jobId });
      }
    }

    throw error;
  }
});

videoQueue.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    processingTime: Date.now() - job.timestamp
  });
});

videoQueue.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job.id,
    error: err.message,
    attemptsMade: job.attemptsMade,
    attemptsMax: job.opts.attempts
  });
});

videoQueue.on('stalled', (job) => {
  logger.warn('Job stalled', { jobId: job.id });
});

process.on('SIGTERM', async () => {
  logger.info('Worker received SIGTERM, shutting down gracefully');
  await videoQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Worker received SIGINT, shutting down gracefully');
  await videoQueue.close();
  process.exit(0);
});

healthMonitor.startPeriodicChecks(120000);

logger.info(`🎬 Video processing worker started (PID: ${process.pid})`, {
  concurrency: WORKER_CONCURRENCY,
  redisUrl: REDIS_URL
});