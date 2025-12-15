/**
 * GPU Detection and Acceleration Helper
 * Enables hardware acceleration when GPU is available
 */

import { spawn } from 'child_process';

export class GPUHelper {
    constructor(logger) {
        this.logger = logger;
        this.gpuAvailable = false;
        this.gpuType = null;
        this.hwAccelMethod = null;
    }

    /**
     * Detect available GPU acceleration
     */
    async detect() {
        // Try NVIDIA first (most common)
        if (await this.checkNVIDIA()) {
            this.gpuAvailable = true;
            this.gpuType = 'nvidia';
            this.hwAccelMethod = 'cuda';
            this.logger.info('🎮 GPU detected: NVIDIA (CUDA acceleration)');
            return true;
        }

        // Try Intel QuickSync
        if (await this.checkIntelQSV()) {
            this.gpuAvailable = true;
            this.gpuType = 'intel';
            this.hwAccelMethod = 'qsv';
            this.logger.info('🎮 GPU detected: Intel (QuickSync acceleration)');
            return true;
        }

        // Try AMD
        if (await this.checkAMD()) {
            this.gpuAvailable = true;
            this.gpuType = 'amd';
            this.hwAccelMethod = 'vaapi';
            this.logger.info('🎮 GPU detected: AMD (VAAPI acceleration)');
            return true;
        }

        this.logger.info('💻 No GPU acceleration available, using CPU');
        return false;
    }

    /**
     * Check NVIDIA GPU availability
     */
    async checkNVIDIA() {
        return new Promise((resolve) => {
            const proc = spawn('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader']);
            let output = '';

            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0 && output.trim()) {
                    this.logger.debug(`Found NVIDIA GPU: ${output.trim()}`);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            proc.on('error', () => resolve(false));

            // Timeout after 5 seconds
            setTimeout(() => resolve(false), 5000);
        });
    }

    /**
     * Check Intel QuickSync availability
     */
    async checkIntelQSV() {
        return new Promise((resolve) => {
            // Check for Intel GPU via ffmpeg
            const proc = spawn('ffmpeg', ['-hide_banner', '-hwaccels']);
            let output = '';

            proc.stderr.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', () => {
                if (output.includes('qsv')) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            proc.on('error', () => resolve(false));
            setTimeout(() => resolve(false), 5000);
        });
    }

    /**
     * Check AMD GPU availability
     */
    async checkAMD() {
        return new Promise((resolve) => {
            const proc = spawn('ffmpeg', ['-hide_banner', '-hwaccels']);
            let output = '';

            proc.stderr.on('data', (data) => {
                output += data.toString();
            });

            proc.on('close', () => {
                if (output.includes('vaapi') || output.includes('amf')) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            proc.on('error', () => resolve(false));
            setTimeout(() => resolve(false), 5000);
        });
    }

    /**
     * Get FFmpeg options for GPU acceleration
     */
    getFFmpegOptions() {
        if (!this.gpuAvailable) {
            return {
                inputOpts: [],
                outputOpts: ['-c:v', 'libx264', '-preset', 'medium'],
                description: 'CPU encoding (libx264)'
            };
        }

        switch (this.hwAccelMethod) {
            case 'cuda':
                return {
                    inputOpts: ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'],
                    outputOpts: ['-c:v', 'h264_nvenc', '-preset', 'p4', '-tune', 'hq'],
                    description: 'NVIDIA GPU encoding (NVENC)'
                };

            case 'qsv':
                return {
                    inputOpts: ['-hwaccel', 'qsv', '-hwaccel_output_format', 'qsv'],
                    outputOpts: ['-c:v', 'h264_qsv', '-preset', 'medium'],
                    description: 'Intel QuickSync encoding (QSV)'
                };

            case 'vaapi':
                return {
                    inputOpts: ['-hwaccel', 'vaapi', '-hwaccel_device', '/dev/dri/renderD128'],
                    outputOpts: ['-c:v', 'h264_vaapi'],
                    description: 'AMD/Intel VAAPI encoding'
                };

            default:
                return {
                    inputOpts: [],
                    outputOpts: ['-c:v', 'libx264', '-preset', 'medium'],
                    description: 'CPU encoding (libx264)'
                };
        }
    }

    /**
     * Get encoding speed improvement estimate
     */
    getSpeedEstimate() {
        switch (this.hwAccelMethod) {
            case 'cuda': return '5-10x faster';
            case 'qsv': return '3-5x faster';
            case 'vaapi': return '3-5x faster';
            default: return '1x (baseline)';
        }
    }

    /**
     * Get GPU status for health check
     */
    getStatus() {
        return {
            available: this.gpuAvailable,
            type: this.gpuType,
            method: this.hwAccelMethod,
            speedEstimate: this.getSpeedEstimate()
        };
    }
}

export default GPUHelper;
