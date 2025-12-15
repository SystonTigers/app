/**
 * Mobile Upload Integration
 * Connects the mobile app to the video processing API
 */

import { verifyJWT, uploadRateLimiter } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';

/**
 * Configure mobile-specific multer for chunked uploads
 */
const mobileStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = `/tmp/mobile-uploads/${req.tenant?.id || 'unknown'}`;
        await fs.ensureDir(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

export const mobileUpload = multer({
    storage: mobileStorage,
    limits: {
        fileSize: 10 * 1024 * 1024 * 1024 // 10GB for full match videos
    }
});

/**
 * Register mobile upload routes
 */
export function registerMobileRoutes(app, videoQueue, logger) {

    /**
     * POST /mobile/upload
     * Mobile app video upload endpoint
     * Supports chunked uploads for large videos
     */
    app.post('/mobile/upload',
        verifyJWT,
        uploadRateLimiter,
        mobileUpload.single('video'),
        async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        error: 'Video file required'
                    });
                }

                logger.info('Mobile upload received', {
                    tenantId: req.tenant.id,
                    filename: req.file.originalname,
                    size: req.file.size
                });

                const {
                    matchId,
                    opponent,
                    matchDate,
                    competition,
                    notes,
                    autoProcess = 'true'
                } = req.body;

                // Validate required fields
                if (!opponent || !matchDate) {
                    // Clean up uploaded file
                    await fs.remove(req.file.path);
                    return res.status(400).json({
                        success: false,
                        error: 'opponent and matchDate are required'
                    });
                }

                // If auto-process is enabled, queue the job
                if (autoProcess === 'true') {
                    const jobData = {
                        videoPath: req.file.path,
                        clubName: req.tenant.id, // Will be resolved to team name
                        opponent,
                        matchDate,
                        competition: competition || 'Match',
                        matchNotes: notes || '',
                        requestId: `mobile-${req.tenant.id}-${Date.now()}`,
                        source: 'mobile',
                        tenantId: req.tenant.id,
                        timestamp: new Date().toISOString()
                    };

                    const job = await videoQueue.add('process-match', jobData, {
                        priority: 10
                    });

                    return res.json({
                        success: true,
                        message: 'Video uploaded and queued for processing',
                        jobId: job.id,
                        statusUrl: `/status/${job.id}`,
                        estimatedTime: '10-20 minutes'
                    });
                }

                // Just save the video, don't process
                return res.json({
                    success: true,
                    message: 'Video uploaded successfully',
                    fileId: req.file.filename,
                    path: req.file.path,
                    size: req.file.size
                });

            } catch (error) {
                logger.error('Mobile upload failed', error);

                // Clean up on error
                if (req.file?.path) {
                    await fs.remove(req.file.path).catch(() => { });
                }

                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );

    /**
     * POST /mobile/upload/chunk
     * Chunked upload for very large videos (>1GB)
     */
    app.post('/mobile/upload/chunk',
        verifyJWT,
        async (req, res) => {
            try {
                const {
                    uploadId,
                    chunkIndex,
                    totalChunks,
                    filename
                } = req.body;

                if (!uploadId || chunkIndex === undefined || !totalChunks) {
                    return res.status(400).json({
                        success: false,
                        error: 'uploadId, chunkIndex, and totalChunks required'
                    });
                }

                const chunkDir = `/tmp/chunks/${req.tenant.id}/${uploadId}`;
                await fs.ensureDir(chunkDir);

                // Save chunk
                const chunkPath = path.join(chunkDir, `chunk_${String(chunkIndex).padStart(5, '0')}`);

                const chunks = [];
                for await (const chunk of req) {
                    chunks.push(chunk);
                }
                await fs.writeFile(chunkPath, Buffer.concat(chunks));

                // Check if all chunks received
                const existingChunks = await fs.readdir(chunkDir);

                if (existingChunks.length === parseInt(totalChunks)) {
                    // Combine chunks
                    const combinedPath = `/tmp/mobile-uploads/${req.tenant.id}/${uploadId}-${filename}`;
                    await fs.ensureDir(path.dirname(combinedPath));

                    const writeStream = fs.createWriteStream(combinedPath);

                    for (let i = 0; i < totalChunks; i++) {
                        const chunkFile = path.join(chunkDir, `chunk_${String(i).padStart(5, '0')}`);
                        const chunkData = await fs.readFile(chunkFile);
                        writeStream.write(chunkData);
                    }

                    writeStream.end();

                    // Cleanup chunks
                    await fs.remove(chunkDir);

                    return res.json({
                        success: true,
                        complete: true,
                        message: 'All chunks received, file assembled',
                        path: combinedPath,
                        uploadId
                    });
                }

                return res.json({
                    success: true,
                    complete: false,
                    chunksReceived: existingChunks.length,
                    totalChunks: parseInt(totalChunks)
                });

            } catch (error) {
                logger.error('Chunk upload failed', error);
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );

    /**
     * GET /mobile/upload/status/:uploadId
     * Check upload status
     */
    app.get('/mobile/upload/status/:uploadId',
        verifyJWT,
        async (req, res) => {
            try {
                const { uploadId } = req.params;
                const chunkDir = `/tmp/chunks/${req.tenant.id}/${uploadId}`;

                if (!await fs.pathExists(chunkDir)) {
                    return res.json({
                        success: true,
                        status: 'not_found',
                        chunksReceived: 0
                    });
                }

                const chunks = await fs.readdir(chunkDir);

                res.json({
                    success: true,
                    status: 'in_progress',
                    chunksReceived: chunks.length
                });

            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: error.message
                });
            }
        }
    );

    logger.info('📱 Mobile upload routes registered');
}

export default registerMobileRoutes;
