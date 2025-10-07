#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

import { AccountSetup } from '../lib/installer/account-setup.js';
import { AuthFlows } from '../lib/installer/auth-flows.js';
import { Deployment } from '../lib/installer/deployment.js';
import { Verification } from '../lib/installer/verification.js';
import { GoogleServices } from '../lib/installer/google-services.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class FootballHighlightsInstaller {
  constructor() {
    this.config = {};
    this.accounts = {};
    this.deployments = {};
    this.installDir = path.join(process.cwd(), 'football-highlights-system');
  }

  async run() {
    try {
      await this.showWelcome();
      await this.collectConfig();
      await this.setupAccounts();
      await this.deployInfrastructure();
      await this.createManagementSheet();
      await this.verifySystem();
      await this.showSuccess();
    } catch (error) {
      this.handleError(error);
    }
  }

  async showWelcome() {
    console.clear();
    console.log(chalk.blue.bold('🏈 Football Highlights System Installer'));
    console.log(chalk.blue('='.repeat(50)));
    console.log();

    console.log(chalk.yellow('This installer will:'));
    console.log(chalk.green('✅ Set up all required accounts (GitHub, Railway, Render, Cloudflare, Google)'));
    console.log(chalk.green('✅ Deploy your video processing infrastructure'));
    console.log(chalk.green('✅ Configure Google Drive & YouTube integration'));
    console.log(chalk.green('✅ Create your match management spreadsheet'));
    console.log(chalk.green('✅ Test everything end-to-end'));
    console.log();

    console.log(chalk.cyan('💰 Cost: 100% FREE forever'));
    console.log(chalk.cyan('⚡ Capacity: 9,000+ videos/month'));
    console.log(chalk.cyan('🎥 Formats: 16:9, 1:1, 9:16 (all social media)'));
    console.log();

    const { proceed } = await inquirer.prompt([{
      type: 'confirm',
      name: 'proceed',
      message: 'Ready to begin setup?',
      default: true
    }]);

    if (!proceed) {
      console.log(chalk.yellow('Setup cancelled.'));
      process.exit(0);
    }
  }

  async collectConfig() {
    console.log(chalk.blue.bold('\\n📋 Configuration'));
    console.log(chalk.gray('Let\\'s get some basic information about your club...\\n'));

    this.config = await inquirer.prompt([
      {
        type: 'input',
        name: 'clubName',
        message: 'What\\'s your football club name?',
        validate: input => input.length > 0 || 'Club name is required'
      },
      {
        type: 'input',
        name: 'season',
        message: 'Current season (e.g., 2024-25):',
        default: '2024-25',
        validate: input => /^\\d{4}-\\d{2}$/.test(input) || 'Format should be YYYY-YY (e.g., 2024-25)'
      },
      {
        type: 'list',
        name: 'region',
        message: 'Select your region for optimal processing:',
        choices: [
          { name: 'US East (fastest for East Coast)', value: 'us-east' },
          { name: 'US West (fastest for West Coast)', value: 'us-west' },
          { name: 'Europe (fastest for UK/EU)', value: 'europe' },
          { name: 'Asia-Pacific (fastest for Asia/Australia)', value: 'asia' }
        ]
      },
      {
        type: 'input',
        name: 'email',
        message: 'Your email (for important notifications):',
        validate: input => {
          const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email address';
        }
      },
      {
        type: 'list',
        name: 'videoQuality',
        message: 'Video processing quality:',
        choices: [
          { name: 'High Quality (slower processing, better videos)', value: 'high' },
          { name: 'Balanced (recommended)', value: 'medium' },
          { name: 'Fast Processing (lower quality, faster)', value: 'fast' }
        ],
        default: 'medium'
      }
    ]);

    // Create installation directory
    await fs.ensureDir(this.installDir);
    await fs.writeJson(path.join(this.installDir, 'config.json'), this.config, { spaces: 2 });

    console.log(chalk.green('✅ Configuration saved'));
  }

  async setupAccounts() {
    console.log(chalk.blue.bold('\\n🔐 Account Setup'));
    console.log(chalk.gray('We\\'ll help you create accounts on all required services...\\n'));

    const accountSetup = new AccountSetup(this.config);
    const authFlows = new AuthFlows();

    // Phase 1: GitHub (required for deployments)
    const spinner1 = ora('Setting up GitHub account...').start();
    try {
      this.accounts.github = await accountSetup.setupGitHub();
      spinner1.succeed('GitHub account configured');
    } catch (error) {
      spinner1.fail('GitHub setup failed');
      throw error;
    }

    // Phase 2: Railway (primary video processing)
    const spinner2 = ora('Setting up Railway account...').start();
    try {
      this.accounts.railway = await accountSetup.setupRailway();
      spinner2.succeed('Railway account configured');
    } catch (error) {
      spinner2.fail('Railway setup failed');
      throw error;
    }

    // Phase 3: Render (backup processing)
    const spinner3 = ora('Setting up Render account...').start();
    try {
      this.accounts.render = await accountSetup.setupRender();
      spinner3.succeed('Render account configured');
    } catch (error) {
      spinner3.fail('Render setup failed');
      throw error;
    }

    // Phase 4: Cloudflare (coordination layer)
    const spinner4 = ora('Setting up Cloudflare account...').start();
    try {
      this.accounts.cloudflare = await accountSetup.setupCloudflare();
      spinner4.succeed('Cloudflare account configured');
    } catch (error) {
      spinner4.fail('Cloudflare setup failed');
      throw error;
    }

    // Phase 5: Google Services (Drive, YouTube, Apps Script)
    const spinner5 = ora('Setting up Google services...').start();
    try {
      this.accounts.google = await accountSetup.setupGoogle();
      spinner5.succeed('Google services configured');
    } catch (error) {
      spinner5.fail('Google setup failed');
      throw error;
    }

    // Save account configuration
    await fs.writeJson(
      path.join(this.installDir, '.accounts.json'),
      this.accounts,
      { spaces: 2 }
    );

    console.log(chalk.green('\\n✅ All accounts configured successfully!'));
  }

  async deployInfrastructure() {
    console.log(chalk.blue.bold('\\n🚀 Infrastructure Deployment'));
    console.log(chalk.gray('Deploying your video processing system to the cloud...\\n'));

    const deployment = new Deployment(this.accounts, this.config);

    // Deploy Railway service (primary processing)
    const spinner1 = ora('Deploying Railway service...').start();
    try {
      this.deployments.railway = await deployment.deployRailway();
      spinner1.succeed('Railway service deployed');
    } catch (error) {
      spinner1.fail('Railway deployment failed');
      throw error;
    }

    // Deploy Render service (backup processing)
    const spinner2 = ora('Deploying Render service...').start();
    try {
      this.deployments.render = await deployment.deployRender();
      spinner2.succeed('Render service deployed');
    } catch (error) {
      spinner2.fail('Render deployment failed');
      throw error;
    }

    // Deploy Cloudflare Worker (coordination)
    const spinner3 = ora('Deploying Cloudflare Worker...').start();
    try {
      this.deployments.cloudflare = await deployment.deployCloudflare();
      spinner3.succeed('Cloudflare Worker deployed');
    } catch (error) {
      spinner3.fail('Cloudflare deployment failed');
      throw error;
    }

    // Save deployment configuration
    await fs.writeJson(
      path.join(this.installDir, '.deployments.json'),
      this.deployments,
      { spaces: 2 }
    );

    console.log(chalk.green('\\n✅ Infrastructure deployed successfully!'));
    console.log(chalk.cyan(`Railway URL: ${this.deployments.railway.url}`));
    console.log(chalk.cyan(`Render URL: ${this.deployments.render.url}`));
    console.log(chalk.cyan(`Cloudflare URL: ${this.deployments.cloudflare.url}`));
  }

  async createManagementSheet() {
    console.log(chalk.blue.bold('\\n📊 Management Sheet Creation'));
    console.log(chalk.gray('Creating your Google Sheet for match management...\\n'));

    const googleServices = new GoogleServices(this.accounts.google, this.config);

    const spinner = ora('Creating management sheet...').start();
    try {
      this.managementSheet = await googleServices.createManagementSheet(this.deployments);
      spinner.succeed('Management sheet created');

      console.log(chalk.green('\\n✅ Management sheet ready!'));
      console.log(chalk.cyan(`Sheet URL: ${this.managementSheet.url}`));
      console.log(chalk.gray('You can now add your players and start managing matches.'));
    } catch (error) {
      spinner.fail('Management sheet creation failed');
      throw error;
    }
  }

  async verifySystem() {
    console.log(chalk.blue.bold('\\n🔍 System Verification'));
    console.log(chalk.gray('Testing all integrations to ensure everything works...\\n'));

    const verification = new Verification(this.accounts, this.deployments, this.managementSheet);

    const spinner = ora('Running system tests...').start();
    try {
      const results = await verification.runAllTests();

      if (results.allPassed) {
        spinner.succeed('All system tests passed');
        console.log(chalk.green('\\n✅ System verification completed successfully!'));

        results.tests.forEach(test => {
          console.log(chalk.green(`  ✅ ${test.name}`));
        });
      } else {
        spinner.fail('Some system tests failed');
        throw new Error('System verification failed');
      }
    } catch (error) {
      spinner.fail('System verification failed');
      throw error;
    }
  }

  async showSuccess() {
    console.log(chalk.green.bold('\\n🎉 Installation Complete!'));
    console.log(chalk.green('='.repeat(50)));
    console.log();

    console.log(chalk.cyan('📊 Your Management Sheet:'));
    console.log(chalk.white(`   ${this.managementSheet.url}`));
    console.log();

    console.log(chalk.cyan('🎥 Video Processing Endpoints:'));
    console.log(chalk.white(`   Primary: ${this.deployments.railway.url}`));
    console.log(chalk.white(`   Backup:  ${this.deployments.render.url}`));
    console.log(chalk.white(`   Control: ${this.deployments.cloudflare.url}`));
    console.log();

    console.log(chalk.cyan('💰 System Capacity (100% FREE):'));
    console.log(chalk.white('   • 9,000+ videos per month'));
    console.log(chalk.white('   • Unlimited storage (Google Drive)'));
    console.log(chalk.white('   • All social media formats (16:9, 1:1, 9:16)'));
    console.log(chalk.white('   • Professional editing with AI detection'));
    console.log();

    console.log(chalk.yellow('🚀 Next Steps:'));
    console.log(chalk.white('   1. Open your management sheet'));
    console.log(chalk.white('   2. Add your players in the Players tab'));
    console.log(chalk.white('   3. Upload your first match video'));
    console.log(chalk.white('   4. Watch the magic happen!'));
    console.log();

    console.log(chalk.gray('📁 Installation files saved to:'));
    console.log(chalk.gray(`   ${this.installDir}`));
  }

  handleError(error) {
    console.log();
    console.log(chalk.red.bold('❌ Installation Failed'));
    console.log(chalk.red('=' .repeat(30)));
    console.log();
    console.log(chalk.red(error.message));

    if (error.details) {
      console.log(chalk.gray('\\nDetails:'));
      console.log(chalk.gray(error.details));
    }

    console.log();
    console.log(chalk.yellow('💡 Need help?'));
    console.log(chalk.gray('   • Check our troubleshooting guide'));
    console.log(chalk.gray('   • Join our Discord community'));
    console.log(chalk.gray('   • Email: support@footballhighlights.com'));

    process.exit(1);
  }
}

// Main execution
async function main() {
  const installer = new FootballHighlightsInstaller();
  await installer.run();
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('❌ Unhandled error:'), error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\\n\\n⏸️  Installation cancelled by user'));
  process.exit(0);
});

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}