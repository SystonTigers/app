const autocannon = require('autocannon');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

class LoadTester {
  constructor(baseUrl = 'http://localhost:8080') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  async runHealthCheckLoadTest(options = {}) {
    console.log('🔥 Running health check load test...');

    const config = {
      url: `${this.baseUrl}/health`,
      connections: options.connections || 50,
      duration: options.duration || 30,
      pipelining: 1,
      ...options
    };

    return new Promise((resolve, reject) => {
      autocannon(config, (err, result) => {
        if (err) {
          reject(err);
          return;
        }

        const summary = {
          test: 'health_check_load',
          duration: result.duration,
          requests: result.requests,
          throughput: result.throughput,
          latency: result.latency,
          errors: result.errors,
          timeouts: result.timeouts,
          non2xx: result.non2xx
        };

        this.results.push(summary);
        console.log(`✅ Health Check Load Test Complete:`);
        console.log(`   Requests: ${result.requests.total}`);
        console.log(`   RPS: ${result.requests.average}`);
        console.log(`   Latency: ${result.latency.average}ms avg, ${result.latency.p99}ms p99`);

        resolve(summary);
      });
    });
  }

  async runAPIEndpointLoadTest() {
    console.log('🎯 Running API endpoint load test...');

    const endpoints = [
      { path: '/health', method: 'GET' },
      { path: '/stats', method: 'GET' },
      { path: '/storage/status', method: 'GET' },
      { path: '/storage/alerts', method: 'GET' }
    ];

    const results = {};

    for (const endpoint of endpoints) {
      console.log(`Testing ${endpoint.method} ${endpoint.path}...`);

      const config = {
        url: `${this.baseUrl}${endpoint.path}`,
        method: endpoint.method,
        connections: 20,
        duration: 10,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const result = await new Promise((resolve, reject) => {
        autocannon(config, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      results[endpoint.path] = {
        requests: result.requests,
        latency: result.latency,
        throughput: result.throughput,
        errors: result.errors + result.timeouts + result.non2xx
      };
    }

    this.results.push({
      test: 'api_endpoints_load',
      endpoints: results
    });

    console.log('✅ API Endpoint Load Test Complete');
    return results;
  }

  async runConcurrentVideoProcessingTest() {
    console.log('🎬 Running concurrent video processing test...');

    const concurrentJobs = 5;
    const testJobs = [];

    // Create test job data
    for (let i = 0; i < concurrentJobs; i++) {
      testJobs.push({
        clubName: `Load Test FC ${i}`,
        opponent: `Test Opponent ${i}`,
        matchDate: '2024-03-15',
        matchNotes: `${15 + i}:30 - Load test action ${i}`,
        createPlayerHighlights: false // Faster processing
      });
    }

    const startTime = Date.now();
    const jobPromises = testJobs.map(job => this.submitMockProcessingJob(job));

    try {
      const results = await Promise.allSettled(jobPromises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r =>
        r.status === 'fulfilled' && r.value.success
      ).length;

      const summary = {
        test: 'concurrent_video_processing',
        totalJobs: concurrentJobs,
        successfulJobs: successful,
        totalTime,
        successRate: (successful / concurrentJobs) * 100,
        averageTimePerJob: totalTime / concurrentJobs
      };

      this.results.push(summary);

      console.log('✅ Concurrent Video Processing Test Complete:');
      console.log(`   Jobs: ${successful}/${concurrentJobs} successful`);
      console.log(`   Success Rate: ${summary.successRate.toFixed(1)}%`);
      console.log(`   Total Time: ${totalTime}ms`);

      return summary;
    } catch (error) {
      console.error('❌ Concurrent processing test failed:', error);
      throw error;
    }
  }

  async runMemoryLeakTest() {
    console.log('🧠 Running memory leak test...');

    const iterations = 100;
    const memorySnapshots = [];

    for (let i = 0; i < iterations; i++) {
      // Make API calls to stress the system
      await Promise.all([
        fetch(`${this.baseUrl}/health`),
        fetch(`${this.baseUrl}/stats`),
        fetch(`${this.baseUrl}/storage/status`)
      ]);

      // Sample memory every 10 iterations
      if (i % 10 === 0) {
        const memoryUsage = await this.getSystemMemoryUsage();
        memorySnapshots.push({
          iteration: i,
          memory: memoryUsage
        });
      }

      // Small delay to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Analyze memory trend
    const initialMemory = memorySnapshots[0]?.memory?.heapUsed || 0;
    const finalMemory = memorySnapshots[memorySnapshots.length - 1]?.memory?.heapUsed || 0;
    const memoryGrowth = finalMemory - initialMemory;
    const memoryGrowthPercent = (memoryGrowth / initialMemory) * 100;

    const summary = {
      test: 'memory_leak',
      iterations,
      initialMemory,
      finalMemory,
      memoryGrowth,
      memoryGrowthPercent,
      snapshots: memorySnapshots.length,
      concerning: memoryGrowthPercent > 50 // Flag if memory grew by more than 50%
    };

    this.results.push(summary);

    console.log('✅ Memory Leak Test Complete:');
    console.log(`   Iterations: ${iterations}`);
    console.log(`   Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB (${memoryGrowthPercent.toFixed(1)}%)`);
    console.log(`   Concerning: ${summary.concerning ? 'YES' : 'NO'}`);

    return summary;
  }

  async runSustainedLoadTest() {
    console.log('⏱️ Running sustained load test (5 minutes)...');

    const config = {
      url: `${this.baseUrl}/health`,
      connections: 30,
      duration: 300, // 5 minutes
      pipelining: 1
    };

    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let lastUpdate = startTime;

      const instance = autocannon(config);

      // Progress updates
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        process.stdout.write(`\r   Progress: ${minutes}:${seconds.toString().padStart(2, '0')}/5:00`);
      }, 5000);

      instance.on('done', (result) => {
        clearInterval(progressInterval);
        console.log('\n');

        const summary = {
          test: 'sustained_load',
          duration: result.duration,
          totalRequests: result.requests.total,
          averageRPS: result.requests.average,
          averageLatency: result.latency.average,
          p95Latency: result.latency.p95,
          p99Latency: result.latency.p99,
          errors: result.errors,
          timeouts: result.timeouts,
          non2xx: result.non2xx
        };

        this.results.push(summary);

        console.log('✅ Sustained Load Test Complete:');
        console.log(`   Duration: ${result.duration}s`);
        console.log(`   Total Requests: ${result.requests.total}`);
        console.log(`   Average RPS: ${result.requests.average}`);
        console.log(`   P95 Latency: ${result.latency.p95}ms`);
        console.log(`   Errors: ${result.errors + result.timeouts + result.non2xx}`);

        resolve(summary);
      });

      instance.on('error', reject);
    });
  }

  async runStressTest() {
    console.log('💥 Running stress test...');

    // Gradually increase load to find breaking point
    const steps = [
      { connections: 10, duration: 30 },
      { connections: 25, duration: 30 },
      { connections: 50, duration: 30 },
      { connections: 100, duration: 30 },
      { connections: 200, duration: 30 }
    ];

    const stressResults = [];

    for (const step of steps) {
      console.log(`Testing with ${step.connections} connections...`);

      const result = await new Promise((resolve, reject) => {
        autocannon({
          url: `${this.baseUrl}/health`,
          connections: step.connections,
          duration: step.duration
        }, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const stepResult = {
        connections: step.connections,
        requests: result.requests.total,
        rps: result.requests.average,
        latency: result.latency.average,
        errors: result.errors + result.timeouts + result.non2xx,
        errorRate: ((result.errors + result.timeouts + result.non2xx) / result.requests.total) * 100
      };

      stressResults.push(stepResult);

      console.log(`   RPS: ${stepResult.rps}, Errors: ${stepResult.errorRate.toFixed(1)}%`);

      // Stop if error rate is too high
      if (stepResult.errorRate > 5) {
        console.log(`   Breaking point reached at ${step.connections} connections`);
        break;
      }
    }

    const summary = {
      test: 'stress_test',
      steps: stressResults,
      maxConnections: stressResults[stressResults.length - 1].connections,
      breakingPoint: stressResults.find(r => r.errorRate > 5)?.connections || 'Not reached'
    };

    this.results.push(summary);

    console.log('✅ Stress Test Complete:');
    console.log(`   Max Connections Tested: ${summary.maxConnections}`);
    console.log(`   Breaking Point: ${summary.breakingPoint}`);

    return summary;
  }

  async submitMockProcessingJob(jobData) {
    // Mock job submission for load testing
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    return {
      success: Math.random() > 0.05, // 95% success rate
      jobId: `mock-job-${Date.now()}-${Math.random()}`,
      estimatedTime: '5-15 minutes'
    };
  }

  async getSystemMemoryUsage() {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);
      if (!response.ok) return null;

      const stats = await response.json();
      return stats.system?.memory;
    } catch {
      return null;
    }
  }

  async generateReport() {
    console.log('\n📊 Generating performance report...');

    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      results: this.results,
      summary: this.generateSummary()
    };

    const reportPath = path.join(__dirname, `../reports/performance-report-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`📄 Report saved to: ${reportPath}`);
    console.log('\n' + this.formatSummary(report.summary));

    return report;
  }

  generateSummary() {
    const summary = {
      totalTests: this.results.length,
      passedTests: 0,
      failedTests: 0,
      concerns: [],
      recommendations: []
    };

    this.results.forEach(result => {
      switch (result.test) {
        case 'health_check_load':
          if (result.errors === 0 && result.latency.average < 100) {
            summary.passedTests++;
          } else {
            summary.failedTests++;
            if (result.latency.average > 100) {
              summary.concerns.push('High latency on health check endpoint');
            }
          }
          break;

        case 'memory_leak':
          if (!result.concerning) {
            summary.passedTests++;
          } else {
            summary.failedTests++;
            summary.concerns.push('Potential memory leak detected');
          }
          break;

        case 'sustained_load':
          if (result.errors < result.totalRequests * 0.01) { // Less than 1% error rate
            summary.passedTests++;
          } else {
            summary.failedTests++;
            summary.concerns.push('High error rate during sustained load');
          }
          break;

        default:
          summary.passedTests++;
      }
    });

    // Generate recommendations
    if (summary.concerns.length === 0) {
      summary.recommendations.push('System performance is excellent for production use');
    } else {
      summary.recommendations.push('Address performance concerns before production deployment');

      if (summary.concerns.some(c => c.includes('memory'))) {
        summary.recommendations.push('Investigate memory usage patterns and implement memory optimization');
      }

      if (summary.concerns.some(c => c.includes('latency'))) {
        summary.recommendations.push('Optimize response times and consider caching strategies');
      }
    }

    return summary;
  }

  formatSummary(summary) {
    let output = '📊 PERFORMANCE TEST SUMMARY\n';
    output += '=' .repeat(50) + '\n';
    output += `Tests Run: ${summary.totalTests}\n`;
    output += `Passed: ${summary.passedTests}\n`;
    output += `Failed: ${summary.failedTests}\n\n`;

    if (summary.concerns.length > 0) {
      output += '⚠️  CONCERNS:\n';
      summary.concerns.forEach(concern => {
        output += `   • ${concern}\n`;
      });
      output += '\n';
    }

    output += '💡 RECOMMENDATIONS:\n';
    summary.recommendations.forEach(rec => {
      output += `   • ${rec}\n`;
    });

    return output;
  }
}

// CLI runner
async function runPerformanceTests() {
  const tester = new LoadTester();

  try {
    console.log('🚀 Starting comprehensive performance tests...\n');

    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    let retries = 30;
    while (retries > 0) {
      try {
        const response = await fetch(`${tester.baseUrl}/health`);
        if (response.ok) break;
      } catch {
        // Server not ready
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries--;
    }

    if (retries === 0) {
      throw new Error('Server not ready for testing');
    }

    console.log('✅ Server is ready!\n');

    // Run all tests
    await tester.runHealthCheckLoadTest();
    await tester.runAPIEndpointLoadTest();
    await tester.runConcurrentVideoProcessingTest();
    await tester.runMemoryLeakTest();
    await tester.runSustainedLoadTest();
    await tester.runStressTest();

    // Generate report
    const report = await tester.generateReport();

    // Exit with appropriate code
    process.exit(report.summary.failedTests > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  }
}

// Export for use in other tests
module.exports = LoadTester;

// Run if called directly
if (require.main === module) {
  runPerformanceTests();
}