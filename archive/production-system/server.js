import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import Queue from 'bull';
import winston from 'winston';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs-extra';

import { VideoProcessor } from './processors/video-processor.js';
import { MatchNotesParser } from './parsers/match-notes-parser.js';
import { AIAnalyzer } from './ai/scene-analyzer.js';
import { DriveManager } from './storage/drive-manager.js';
import { StorageCoordinator } from './storage/storage-coordinator.js';
import { createStorageDashboard } from './storage/storage-dashboard.js';
import { HealthMonitor } from './monitoring/health-monitor.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configure logging
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
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
const port = process.env.PORT || 8080;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = '/tmp/uploads';
    await fs.ensureDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB limit
});

// Initialize Redis connection for job queue
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create job queues
const videoQueue = new Queue('video processing', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 10,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

// Create Bull Dashboard for monitoring
const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(videoQueue)],
  serverAdapter: serverAdapter
});

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());

// Storage dashboard
const storageDashboard = createStorageDashboard(storageCoordinator, logger);
app.use('/storage/dashboard', storageDashboard);

// Initialize components
const credentials = {
  google: JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}')
};

const storageCoordinator = new StorageCoordinator(logger, credentials);
const videoProcessor = new VideoProcessor(logger, storageCoordinator);
const notesParser = new MatchNotesParser(logger);
const aiAnalyzer = new AIAnalyzer(logger);
const driveManager = new DriveManager(logger);
const healthMonitor = new HealthMonitor(logger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = await healthMonitor.getSystemHealth();
    res.json({
      status: health.overall,
      timestamp: new Date().toISOString(),
      service: 'football-highlights-processor',
      version: process.env.npm_package_version || '2.0.0',
      uptime: process.uptime(),
      details: health
    });
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Main video processing endpoint
app.post('/process', upload.single('video'), async (req, res) => {
  try {
    const {
      clubName,
      opponent,
      matchDate,
      matchNotes,
      manualCuts,
      createPlayerHighlights = false,
      videoUrl,
      notificationUrl
    } = req.body;

    // Validate required fields
    if (!clubName || !opponent || !matchDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: clubName, opponent, matchDate'
      });
    }

    if (!req.file && !videoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Either video file or videoUrl must be provided'
      });
    }

    // Create processing job
    const jobData = {
      clubName,
      opponent,
      matchDate,
      matchNotes: matchNotes || '',
      manualCuts: JSON.parse(manualCuts || '[]'),
      createPlayerHighlights: createPlayerHighlights === 'true',
      videoPath: req.file?.path,
      videoUrl: videoUrl,
      notificationUrl,
      requestId: `${clubName}-${matchDate}-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    // Add job to queue
    const job = await videoQueue.add('process-match', jobData, {
      priority: createPlayerHighlights ? 5 : 10, // Player highlights get lower priority
      delay: 0
    });

    logger.info('Video processing job created', {
      jobId: job.id,
      club: clubName,
      opponent: opponent
    });

    res.json({
      success: true,
      message: 'Video processing job created successfully',
      jobId: job.id,
      estimatedTime: '5-15 minutes',
      statusUrl: `/status/${job.id}`
    });

  } catch (error) {
    logger.error('Failed to create processing job', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Job status endpoint
app.get('/status/:jobId', async (req, res) => {
  try {
    const job = await videoQueue.getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const state = await job.getState();
    const progress = job.progress();

    res.json({
      success: true,
      jobId: job.id,
      status: state,
      progress: progress,
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      createdAt: job.timestamp
    });

  } catch (error) {
    logger.error('Failed to get job status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Parse match notes endpoint (for testing)
app.post('/parse-notes', async (req, res) => {
  try {
    const { matchNotes } = req.body;

    if (!matchNotes) {
      return res.status(400).json({
        success: false,
        error: 'matchNotes is required'
      });
    }

    const parsed = await notesParser.parseMatchNotes(matchNotes);

    res.json({
      success: true,
      parsed: parsed,
      stats: {
        totalActions: parsed.actions.length,
        playersFound: parsed.players.length,
        actionTypes: [...new Set(parsed.actions.map(a => a.action))]
      }
    });

  } catch (error) {
    logger.error('Failed to parse match notes', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Queue statistics endpoint
app.get('/stats', async (req, res) => {
  try {
    const waiting = await videoQueue.getWaiting();
    const active = await videoQueue.getActive();
    const completed = await videoQueue.getCompleted();
    const failed = await videoQueue.getFailed();

    res.json({
      success: true,
      stats: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        total: waiting.length + active.length + completed.length + failed.length
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    });

  } catch (error) {
    logger.error('Failed to get stats', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Storage management endpoints
app.get('/storage/status', async (req, res) => {
  try {
    const status = await storageCoordinator.getStorageStatus();
    res.json({
      success: true,
      status
    });
  } catch (error) {
    logger.error('Failed to get storage status', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/storage/report/:timeframe?', async (req, res) => {
  try {
    const timeframe = req.params.timeframe || '24h';
    const report = await storageCoordinator.generateStorageReport(timeframe);
    res.json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Failed to generate storage report', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/storage/alerts', async (req, res) => {
  try {
    const alerts = storageCoordinator.getActiveAlerts();
    res.json({
      success: true,
      alerts
    });
  } catch (error) {
    logger.error('Failed to get storage alerts', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/storage/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolved = await storageCoordinator.resolveAlert(alertId);

    if (resolved) {
      res.json({
        success: true,
        message: 'Alert resolved successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    logger.error('Failed to resolve alert', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/storage/cleanup/manual', async (req, res) => {
  try {
    const { olderThanDays = 30, dryRun = false } = req.body;

    const result = dryRun
      ? await storageCoordinator.previewCleanup(olderThanDays)
      : await storageCoordinator.runManualCleanup(olderThanDays);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    logger.error('Manual cleanup failed', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/storage/privacy/public/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    // Get job result from queue
    const job = await videoQueue.getJob(jobId);

    if (!job || !job.returnvalue?.uploadResults) {
      return res.status(404).json({
        success: false,
        error: 'Job or upload results not found'
      });
    }

    const results = await storageCoordinator.makePublic(job.returnvalue.uploadResults);

    res.json({
      success: true,
      message: 'Videos made public',
      results
    });
  } catch (error) {
    logger.error('Failed to make videos public', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Process video jobs
videoQueue.process('process-match', 3, async (job) => {
  try {
    logger.info('Starting video processing job', { jobId: job.id });

    job.progress(10);
    await job.update({ status: 'downloading' });

    // Step 1: Get video file
    let inputPath;
    if (job.data.videoUrl) {
      inputPath = await driveManager.downloadVideo(job.data.videoUrl);
      job.progress(20);
    } else {
      inputPath = job.data.videoPath;
    }

    await job.update({ status: 'parsing_notes' });
    job.progress(30);

    // Step 2: Parse match notes
    const noteData = await notesParser.parseMatchNotes(job.data.matchNotes);
    logger.info('Match notes parsed', {
      actions: noteData.actions.length,
      players: noteData.players.length
    });

    await job.update({ status: 'ai_analysis' });
    job.progress(40);

    // Step 3: AI scene analysis
    const sceneAnalysis = await aiAnalyzer.analyzeScenes(inputPath, noteData);
    logger.info('AI analysis complete', {
      aiHighlights: sceneAnalysis.highlights.length
    });

    await job.update({ status: 'processing_highlights' });
    job.progress(50);

    // Step 4: Process video
    const result = await videoProcessor.processMatchVideo({
      inputPath,
      matchNotes: job.data.matchNotes,
      clubName: job.data.clubName,
      opponent: job.data.opponent,
      matchDate: job.data.matchDate,
      manualCuts: job.data.manualCuts,
      createPlayerHighlights: job.data.createPlayerHighlights,
      noteData,
      sceneAnalysis,
      progressCallback: (progress) => {
        job.progress(50 + (progress * 0.4)); // 50-90%
      }
    });

    await job.update({ status: 'uploading' });
    job.progress(90);

    // Step 5: Upload results
    const uploadResults = await driveManager.uploadResults(result, {
      clubName: job.data.clubName,
      opponent: job.data.opponent,
      matchDate: job.data.matchDate
    });

    job.progress(100);

    // Step 6: Send notification if URL provided
    if (job.data.notificationUrl) {
      await fetch(job.data.notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          status: 'completed',
          result: uploadResults
        })
      }).catch(error => logger.warn('Notification failed', error));
    }

    // Step 7: Cleanup temporary files
    if (job.data.videoUrl && inputPath) {
      await fs.remove(inputPath).catch(() => {}); // Ignore cleanup errors
    }

    logger.info('Video processing completed', {
      jobId: job.id,
      processingTime: Date.now() - job.timestamp
    });

    return uploadResults;

  } catch (error) {
    logger.error('Video processing job failed', { jobId: job.id, error: error.message });

    // Send failure notification
    if (job.data.notificationUrl) {
      await fetch(job.data.notificationUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          status: 'failed',
          error: error.message
        })
      }).catch(() => {}); // Ignore notification errors
    }

    throw error;
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Express error handler', error);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    endpoints: [
      'POST /process - Process match video',
      'GET /status/:jobId - Get job status',
      'POST /parse-notes - Parse match notes',
      'GET /stats - Queue statistics',
      'GET /health - System health',
      'GET /admin/queues - Job monitoring dashboard',
      'GET /storage/dashboard - Storage management dashboard',
      'GET /storage/status - Storage usage and analytics',
      'GET /storage/report/:timeframe - Generate storage reports',
      'GET /storage/alerts - Active storage alerts',
      'POST /storage/alerts/:alertId/resolve - Resolve storage alert',
      'POST /storage/cleanup/manual - Run manual cleanup',
      'POST /storage/privacy/public/:jobId - Make videos public'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  await videoQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  await videoQueue.close();
  process.exit(0);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  logger.info(`🎬 Football Highlights Processor started on port ${port}`);
  logger.info(`📊 Queue dashboard: http://localhost:${port}/admin/queues`);
  logger.info(`🔍 Health check: http://localhost:${port}/health`);
});

export default app;