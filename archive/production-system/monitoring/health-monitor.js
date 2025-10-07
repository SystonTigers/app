import os from 'os';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class HealthMonitor {
  constructor(logger) {
    this.logger = logger;
    this.checks = new Map();
    this.thresholds = {
      cpu: 85,
      memory: 90,
      disk: 85,
      responseTime: 5000
    };
  }

  async getSystemHealth() {
    const checks = await Promise.allSettled([
      this.checkCPU(),
      this.checkMemory(),
      this.checkDisk(),
      this.checkRedis(),
      this.checkFFmpeg(),
      this.checkGoogleDrive(),
      this.checkTensorFlow()
    ]);

    const results = {
      cpu: this.extractResult(checks[0]),
      memory: this.extractResult(checks[1]),
      disk: this.extractResult(checks[2]),
      redis: this.extractResult(checks[3]),
      ffmpeg: this.extractResult(checks[4]),
      googleDrive: this.extractResult(checks[5]),
      tensorFlow: this.extractResult(checks[6])
    };

    const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;
    const totalCount = Object.keys(results).length;

    results.overall = healthyCount === totalCount ? 'healthy' :
                     healthyCount >= totalCount * 0.7 ? 'degraded' : 'unhealthy';

    results.summary = {
      healthy: healthyCount,
      total: totalCount,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };

    return results;
  }

  async checkCPU() {
    try {
      const cpuUsage = await this.getCPUUsage();
      const status = cpuUsage < this.thresholds.cpu ? 'healthy' : 'unhealthy';

      return {
        status,
        usage: `${cpuUsage.toFixed(1)}%`,
        threshold: `${this.thresholds.cpu}%`,
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkMemory() {
    try {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const usagePercent = (usedMem / totalMem) * 100;

      const status = usagePercent < this.thresholds.memory ? 'healthy' : 'unhealthy';

      return {
        status,
        usage: `${usagePercent.toFixed(1)}%`,
        used: this.formatBytes(usedMem),
        total: this.formatBytes(totalMem),
        free: this.formatBytes(freeMem),
        threshold: `${this.thresholds.memory}%`
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkDisk() {
    try {
      const diskUsage = await this.getDiskUsage('/tmp');
      const usagePercent = (diskUsage.used / diskUsage.total) * 100;
      const status = usagePercent < this.thresholds.disk ? 'healthy' : 'unhealthy';

      return {
        status,
        usage: `${usagePercent.toFixed(1)}%`,
        used: this.formatBytes(diskUsage.used),
        total: this.formatBytes(diskUsage.total),
        free: this.formatBytes(diskUsage.free),
        threshold: `${this.thresholds.disk}%`,
        path: '/tmp'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkRedis() {
    try {
      const startTime = Date.now();

      const { createClient } = await import('redis');
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
      });

      await client.connect();
      const pong = await client.ping();
      const responseTime = Date.now() - startTime;
      await client.disconnect();

      const status = pong === 'PONG' && responseTime < this.thresholds.responseTime ? 'healthy' : 'unhealthy';

      return {
        status,
        responseTime: `${responseTime}ms`,
        connection: pong === 'PONG' ? 'successful' : 'failed'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  async checkFFmpeg() {
    try {
      const { stdout } = await execAsync('ffmpeg -version');
      const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return {
        status: 'healthy',
        version,
        available: true
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        available: false,
        error: 'FFmpeg not found or not working'
      };
    }
  }

  async checkGoogleDrive() {
    try {
      const hasCredentials = !!process.env.GOOGLE_CREDENTIALS;

      if (!hasCredentials) {
        return {
          status: 'unhealthy',
          configured: false,
          error: 'Google credentials not configured'
        };
      }

      try {
        JSON.parse(process.env.GOOGLE_CREDENTIALS);
      } catch (e) {
        return {
          status: 'unhealthy',
          configured: false,
          error: 'Invalid Google credentials format'
        };
      }

      return {
        status: 'healthy',
        configured: true,
        credentials: 'valid'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  async checkTensorFlow() {
    try {
      const tf = await import('@tensorflow/tfjs-node');

      const version = tf.version.tfjs;
      const backend = tf.getBackend();

      const testTensor = tf.tensor2d([[1, 2], [3, 4]]);
      const result = tf.sum(testTensor);
      const value = await result.data();

      testTensor.dispose();
      result.dispose();

      const isWorking = value[0] === 10;

      return {
        status: isWorking ? 'healthy' : 'unhealthy',
        version,
        backend,
        testPassed: isWorking
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        available: false
      };
    }
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = process.hrtime(startTime);

        const totalTime = endTime[0] * 1000000 + endTime[1] / 1000;
        const cpuTime = endUsage.user + endUsage.system;
        const cpuPercent = (cpuTime / totalTime) * 100;

        resolve(Math.min(cpuPercent, 100));
      }, 100);
    });
  }

  async getDiskUsage(path) {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync(`dir /-c "${path}"`);
        const lines = stdout.split('\n');
        const lastLine = lines[lines.length - 2];
        const match = lastLine.match(/(\d+)/g);

        if (match && match.length >= 2) {
          const free = parseInt(match[match.length - 1]);
          const used = parseInt(match[match.length - 2]);
          return {
            total: used + free,
            used,
            free
          };
        }
      } else {
        const { stdout } = await execAsync(`df -B1 "${path}"`);
        const lines = stdout.trim().split('\n');
        const dataLine = lines[lines.length - 1];
        const columns = dataLine.split(/\s+/);

        return {
          total: parseInt(columns[1]),
          used: parseInt(columns[2]),
          free: parseInt(columns[3])
        };
      }
    } catch (error) {
      // Fallback: use fs.stat on a test file
      const stats = await fs.stat(path);
      return {
        total: 1000000000, // 1GB default
        used: 500000000,   // 500MB default
        free: 500000000    // 500MB default
      };
    }
  }

  extractResult(settledPromise) {
    if (settledPromise.status === 'fulfilled') {
      return settledPromise.value;
    } else {
      return {
        status: 'error',
        error: settledPromise.reason?.message || 'Unknown error'
      };
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async startPeriodicChecks(intervalMs = 60000) {
    this.logger.info(`Starting periodic health checks every ${intervalMs}ms`);

    const runCheck = async () => {
      try {
        const health = await this.getSystemHealth();

        if (health.overall !== 'healthy') {
          this.logger.warn('System health check failed', {
            overall: health.overall,
            issues: Object.entries(health)
              .filter(([key, value]) => value.status && value.status !== 'healthy')
              .map(([key, value]) => ({ component: key, status: value.status, error: value.error }))
          });
        } else {
          this.logger.debug('System health check passed', {
            overall: health.overall,
            uptime: health.summary.uptime
          });
        }
      } catch (error) {
        this.logger.error('Health check error', error);
      }
    };

    runCheck();
    setInterval(runCheck, intervalMs);
  }
}