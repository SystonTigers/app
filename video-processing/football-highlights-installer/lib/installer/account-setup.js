import chalk from 'chalk';
import inquirer from 'inquirer';
import open from 'open';
import qrcode from 'qrcode-terminal';
import { AuthFlows } from './auth-flows.js';

export class AccountSetup {
  constructor(config) {
    this.config = config;
    this.authFlows = new AuthFlows();
  }

  async setupGitHub() {
    console.log(chalk.blue('\\n🔄 Setting up GitHub...'));
    console.log(chalk.gray('GitHub is required to deploy your video processing system.\\n'));

    // Check if user already has GitHub account
    const { hasAccount } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasAccount',
      message: 'Do you already have a GitHub account?',
      default: false
    }]);

    if (!hasAccount) {
      console.log(chalk.yellow('\\n📝 Creating GitHub account...'));
      console.log(chalk.gray('Opening GitHub signup page in your browser...\\n'));

      await open('https://github.com/join');

      await inquirer.prompt([{
        type: 'confirm',
        name: 'created',
        message: 'Have you created your GitHub account? (Press Enter when done)'
      }]);
    }

    // Authenticate with GitHub using Device Flow
    console.log(chalk.blue('\\n🔐 Authenticating with GitHub...'));

    try {
      const auth = await this.authFlows.githubDeviceFlow();

      // Create repository for the project
      console.log(chalk.blue('\\n📦 Creating project repository...'));
      const repo = await this.authFlows.createGitHubRepo(auth, {
        name: `${this.config.clubName.toLowerCase().replace(/\\s+/g, '-')}-highlights`,
        description: `Football highlights automation for ${this.config.clubName}`,
        private: false
      });

      return {
        service: 'github',
        auth,
        repository: repo,
        username: auth.username
      };
    } catch (error) {
      throw new Error(`GitHub setup failed: ${error.message}`);
    }
  }

  async setupRailway() {
    console.log(chalk.blue('\\n🚂 Setting up Railway...'));
    console.log(chalk.gray('Railway provides free video processing (500 hours/month).\\n'));

    const { hasAccount } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasAccount',
      message: 'Do you already have a Railway account?',
      default: false
    }]);

    if (!hasAccount) {
      console.log(chalk.yellow('\\n📝 Creating Railway account...'));
      console.log(chalk.gray('Opening Railway signup page in your browser...\\n'));
      console.log(chalk.cyan('💡 Tip: Sign up with GitHub for easier setup'));

      await open('https://railway.app/login');

      await inquirer.prompt([{
        type: 'confirm',
        name: 'created',
        message: 'Have you created your Railway account? (Press Enter when done)'
      }]);
    }

    // Get Railway token
    console.log(chalk.blue('\\n🔑 Getting Railway API token...'));
    console.log(chalk.gray('Go to: https://railway.app/account/tokens\\n'));

    await open('https://railway.app/account/tokens');

    const { token } = await inquirer.prompt([{
      type: 'password',
      name: 'token',
      message: 'Paste your Railway API token:',
      validate: input => input.length > 10 || 'Please enter a valid Railway token'
    }]);

    // Validate token
    try {
      const projects = await this.authFlows.validateRailwayToken(token);

      return {
        service: 'railway',
        token,
        projects: projects.slice(0, 5) // Limit to first 5 projects
      };
    } catch (error) {
      throw new Error(`Railway setup failed: ${error.message}`);
    }
  }

  async setupRender() {
    console.log(chalk.blue('\\n🎨 Setting up Render...'));
    console.log(chalk.gray('Render provides backup video processing (750 hours/month free).\\n'));

    const { hasAccount } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasAccount',
      message: 'Do you already have a Render account?',
      default: false
    }]);

    if (!hasAccount) {
      console.log(chalk.yellow('\\n📝 Creating Render account...'));
      console.log(chalk.gray('Opening Render signup page in your browser...\\n'));

      await open('https://render.com/register');

      await inquirer.prompt([{
        type: 'confirm',
        name: 'created',
        message: 'Have you created your Render account? (Press Enter when done)'
      }]);
    }

    // Get Render API key
    console.log(chalk.blue('\\n🔑 Getting Render API key...'));
    console.log(chalk.gray('Go to: https://dashboard.render.com/account/api-keys\\n'));

    await open('https://dashboard.render.com/account/api-keys');

    const { apiKey } = await inquirer.prompt([{
      type: 'password',
      name: 'apiKey',
      message: 'Paste your Render API key:',
      validate: input => input.startsWith('rnd_') || 'Please enter a valid Render API key (starts with rnd_)'
    }]);

    // Validate API key
    try {
      const services = await this.authFlows.validateRenderKey(apiKey);

      return {
        service: 'render',
        apiKey,
        services: services.slice(0, 5) // Limit to first 5 services
      };
    } catch (error) {
      throw new Error(`Render setup failed: ${error.message}`);
    }
  }

  async setupCloudflare() {
    console.log(chalk.blue('\\n☁️ Setting up Cloudflare...'));
    console.log(chalk.gray('Cloudflare coordinates your video processing (100% free).\\n'));

    const { hasAccount } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasAccount',
      message: 'Do you already have a Cloudflare account?',
      default: false
    }]);

    if (!hasAccount) {
      console.log(chalk.yellow('\\n📝 Creating Cloudflare account...'));
      console.log(chalk.gray('Opening Cloudflare signup page in your browser...\\n'));

      await open('https://dash.cloudflare.com/sign-up');

      await inquirer.prompt([{
        type: 'confirm',
        name: 'created',
        message: 'Have you created your Cloudflare account? (Press Enter when done)'
      }]);
    }

    // Get Cloudflare API token
    console.log(chalk.blue('\\n🔑 Getting Cloudflare API token...'));
    console.log(chalk.gray('Go to: https://dash.cloudflare.com/profile/api-tokens\\n'));
    console.log(chalk.cyan('💡 Create a Custom token with:'));
    console.log(chalk.gray('   • Zone:Zone:Edit'));
    console.log(chalk.gray('   • Zone:Zone Settings:Edit'));
    console.log(chalk.gray('   • User:User Details:Read\\n'));

    await open('https://dash.cloudflare.com/profile/api-tokens');

    const { apiToken } = await inquirer.prompt([{
      type: 'password',
      name: 'apiToken',
      message: 'Paste your Cloudflare API token:',
      validate: input => input.length > 20 || 'Please enter a valid Cloudflare API token'
    }]);

    // Validate API token
    try {
      const zones = await this.authFlows.validateCloudflareToken(apiToken);

      return {
        service: 'cloudflare',
        apiToken,
        zones: zones.slice(0, 5), // Limit to first 5 zones
        accountId: zones[0]?.account?.id || 'default'
      };
    } catch (error) {
      throw new Error(`Cloudflare setup failed: ${error.message}`);
    }
  }

  async setupGoogle() {
    console.log(chalk.blue('\\n📱 Setting up Google services...'));
    console.log(chalk.gray('Google provides Drive storage, YouTube hosting, and Apps Script automation.\\n'));

    const { hasAccount } = await inquirer.prompt([{
      type: 'confirm',
      name: 'hasAccount',
      message: 'Do you have a Google account?',
      default: true
    }]);

    if (!hasAccount) {
      console.log(chalk.yellow('\\n📝 Creating Google account...'));
      console.log(chalk.gray('Opening Google account creation page...\\n'));

      await open('https://accounts.google.com/signup');

      await inquirer.prompt([{
        type: 'confirm',
        name: 'created',
        message: 'Have you created your Google account? (Press Enter when done)'
      }]);
    }

    // Set up Google OAuth
    console.log(chalk.blue('\\n🔐 Setting up Google authentication...'));
    console.log(chalk.gray('This will allow the system to:'));
    console.log(chalk.gray('   • Create and manage Google Sheets'));
    console.log(chalk.gray('   • Store videos in Google Drive'));
    console.log(chalk.gray('   • Upload videos to YouTube'));
    console.log(chalk.gray('   • Deploy Apps Script automation\\n'));

    try {
      // Create Google Cloud Project
      console.log(chalk.blue('Creating Google Cloud project...'));
      const project = await this.authFlows.createGoogleCloudProject({
        name: `${this.config.clubName} Highlights`,
        id: `${this.config.clubName.toLowerCase().replace(/\\s+/g, '-')}-highlights-${Date.now()}`
      });

      // Enable required APIs
      console.log(chalk.blue('Enabling required Google APIs...'));
      await this.authFlows.enableGoogleAPIs(project.id, [
        'drive.googleapis.com',
        'youtube.googleapis.com',
        'sheets.googleapis.com',
        'script.googleapis.com',
        'iam.googleapis.com'
      ]);

      // Set up OAuth consent screen
      console.log(chalk.blue('Configuring OAuth consent...'));
      await this.authFlows.setupOAuthConsent(project.id, {
        applicationName: `${this.config.clubName} Highlights System`,
        supportEmail: this.config.email,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/script.projects'
        ]
      });

      // Create OAuth credentials
      console.log(chalk.blue('Creating OAuth credentials...'));
      const credentials = await this.authFlows.createOAuthCredentials(project.id, {
        applicationName: `${this.config.clubName} Highlights`,
        redirectUris: ['http://localhost:3000/callback', 'urn:ietf:wg:oauth:2.0:oob']
      });

      // Authenticate user
      console.log(chalk.blue('\\n🔐 Authenticating with Google...'));
      const auth = await this.authFlows.googleOAuthFlow(credentials);

      return {
        service: 'google',
        project,
        credentials,
        auth,
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/script.projects'
        ]
      };
    } catch (error) {
      throw new Error(`Google setup failed: ${error.message}`);
    }
  }

  // Helper method to wait for user confirmation
  async waitForUserConfirmation(message) {
    return inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: message,
      default: true
    }]);
  }

  // Helper method to display QR code for mobile authentication
  displayQRCode(url) {
    console.log(chalk.blue('\\n📱 Scan QR code with your phone:'));
    qrcode.generate(url, { small: true });
    console.log();
  }

  // Helper method to validate service credentials
  async validateCredentials(service, credentials) {
    try {
      switch (service) {
        case 'github':
          return await this.authFlows.validateGitHubAuth(credentials);
        case 'railway':
          return await this.authFlows.validateRailwayToken(credentials.token);
        case 'render':
          return await this.authFlows.validateRenderKey(credentials.apiKey);
        case 'cloudflare':
          return await this.authFlows.validateCloudflareToken(credentials.apiToken);
        case 'google':
          return await this.authFlows.validateGoogleAuth(credentials);
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    } catch (error) {
      throw new Error(`Validation failed for ${service}: ${error.message}`);
    }
  }
}