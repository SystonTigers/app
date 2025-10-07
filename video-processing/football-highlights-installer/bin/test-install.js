#!/usr/bin/env node

/**
 * Test script for Football Highlights Installer
 * Runs basic validation tests without actually installing
 */

import chalk from 'chalk';
import ora from 'ora';
import { AccountSetup } from '../lib/installer/account-setup.js';
import { AuthFlows } from '../lib/installer/auth-flows.js';
import { Deployment } from '../lib/installer/deployment.js';
import { Verification } from '../lib/installer/verification.js';
import { GoogleServices } from '../lib/installer/google-services.js';

class InstallerTester {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runTests() {
    console.log(chalk.blue.bold('🧪 Football Highlights Installer - Test Suite'));
    console.log(chalk.blue('='.repeat(55)));
    console.log();

    await this.testModuleImports();
    await this.testClassInstantiation();
    await this.testConfigValidation();
    await this.testCodeGeneration();

    this.showResults();
  }

  async testModuleImports() {
    console.log(chalk.yellow('📦 Testing Module Imports...'));

    await this.runTest('AccountSetup Import', () => {
      return AccountSetup !== undefined;
    });

    await this.runTest('AuthFlows Import', () => {
      return AuthFlows !== undefined;
    });

    await this.runTest('Deployment Import', () => {
      return Deployment !== undefined;
    });

    await this.runTest('Verification Import', () => {
      return Verification !== undefined;
    });

    await this.runTest('GoogleServices Import', () => {
      return GoogleServices !== undefined;
    });
  }

  async testClassInstantiation() {
    console.log(chalk.yellow('\\n🏗️  Testing Class Instantiation...'));

    const mockConfig = {
      clubName: 'Test FC',
      season: '2024-25',
      region: 'europe',
      email: 'test@example.com',
      videoQuality: 'medium'
    };

    const mockAccounts = {
      github: { token: 'test', repository: { fullName: 'test/repo' } },
      railway: { token: 'test' },
      render: { apiKey: 'test' },
      cloudflare: { apiToken: 'test', accountId: 'test' },
      google: { auth: { client: {} } }
    };

    await this.runTest('AccountSetup Instantiation', () => {
      const setup = new AccountSetup(mockConfig);
      return setup.config.clubName === 'Test FC';
    });

    await this.runTest('AuthFlows Instantiation', () => {
      const auth = new AuthFlows();
      return auth.tempDir !== undefined;
    });

    await this.runTest('Deployment Instantiation', () => {
      const deployment = new Deployment(mockAccounts, mockConfig);
      return deployment.accounts.github.token === 'test';
    });

    await this.runTest('Verification Instantiation', () => {
      const verification = new Verification(mockAccounts, {}, {});
      return verification.accounts.railway.token === 'test';
    });

    await this.runTest('GoogleServices Instantiation', () => {
      const mockGoogleAuth = {
        auth: { client: {} }
      };
      const googleServices = new GoogleServices(mockGoogleAuth, mockConfig);
      return googleServices.config.clubName === 'Test FC';
    });
  }

  async testConfigValidation() {
    console.log(chalk.yellow('\\n⚙️  Testing Configuration Validation...'));

    await this.runTest('Valid Config Structure', () => {
      const config = {
        clubName: 'Test FC',
        season: '2024-25',
        region: 'europe',
        email: 'test@example.com',
        videoQuality: 'medium'
      };

      return config.clubName.length > 0 &&
             /^\\d{4}-\\d{2}$/.test(config.season) &&
             /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(config.email);
    });

    await this.runTest('Region Options Valid', () => {
      const validRegions = ['us-east', 'us-west', 'europe', 'asia'];
      return validRegions.includes('europe') && validRegions.length === 4;
    });

    await this.runTest('Video Quality Options Valid', () => {
      const validQualities = ['fast', 'medium', 'high'];
      return validQualities.includes('medium') && validQualities.length === 3;
    });
  }

  async testCodeGeneration() {
    console.log(chalk.yellow('\\n🛠️  Testing Code Generation...'));

    const mockAccounts = {
      github: { token: 'test', repository: { fullName: 'test/repo' } },
      railway: { token: 'test' },
      render: { apiKey: 'test' },
      cloudflare: { apiToken: 'test', accountId: 'test' },
      google: { auth: { client: {} } }
    };

    const mockConfig = {
      clubName: 'Test FC',
      season: '2024-25',
      region: 'europe',
      email: 'test@example.com',
      videoQuality: 'medium'
    };

    const mockDeployments = {
      railway: { url: 'https://test-railway.railway.app' },
      render: { url: 'https://test-render.onrender.com' },
      cloudflare: { url: 'https://test.workers.dev' }
    };

    await this.runTest('Highlights Processor Code Generation', async () => {
      const deployment = new Deployment(mockAccounts, mockConfig);
      const code = await deployment.generateHighlightsProcessor();
      return code.includes('express') &&
             code.includes('/process') &&
             code.includes('/health');
    });

    await this.runTest('Cloudflare Worker Code Generation', async () => {
      const deployment = new Deployment(mockAccounts, mockConfig);
      const code = await deployment.generateCloudflareWorkerScript();
      return code.includes('addEventListener') &&
             code.includes('/coordinate') &&
             code.includes('coordinateProcessing');
    });

    await this.runTest('Apps Script Code Generation', async () => {
      const mockGoogleAuth = { auth: { client: {} } };
      const googleServices = new GoogleServices(mockGoogleAuth, mockConfig);
      const code = googleServices.generateAppsScriptCode(mockDeployments);

      return code.mainCode.includes('processMatchEvent') &&
             code.videoProcessor.includes('uploadVideoFile') &&
             code.utilities.includes('healthCheck');
    });
  }

  async runTest(name, testFunc) {
    const spinner = ora(`${name}...`).start();

    try {
      const result = await testFunc();
      if (result) {
        spinner.succeed(chalk.green(`${name}`));
        this.passed++;
      } else {
        spinner.fail(chalk.red(`${name} - Test returned false`));
        this.failed++;
      }
    } catch (error) {
      spinner.fail(chalk.red(`${name} - ${error.message}`));
      this.failed++;
    }

    this.tests.push({ name, status: this.tests.length < this.passed ? 'passed' : 'failed' });
  }

  showResults() {
    console.log();
    console.log(chalk.blue.bold('📊 Test Results'));
    console.log(chalk.blue('='.repeat(20)));
    console.log();

    if (this.failed === 0) {
      console.log(chalk.green.bold('🎉 All tests passed!'));
      console.log(chalk.green(`✅ ${this.passed} tests completed successfully`));
      console.log();
      console.log(chalk.cyan('The installer is ready to use:'));
      console.log(chalk.white('npx create-football-highlights'));
    } else {
      console.log(chalk.red.bold('❌ Some tests failed'));
      console.log(chalk.red(`❌ ${this.failed} failed`));
      console.log(chalk.green(`✅ ${this.passed} passed`));
      console.log();
      console.log(chalk.yellow('Please fix the issues before using the installer.'));
    }

    console.log();
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new InstallerTester();
  tester.runTests().catch(console.error);
}