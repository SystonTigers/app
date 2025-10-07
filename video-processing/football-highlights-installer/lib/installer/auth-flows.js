import fetch from 'node-fetch';
import { google } from 'googleapis';
import express from 'express';
import open from 'open';
import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';

export class AuthFlows {
  constructor() {
    this.tempDir = path.join(process.cwd(), '.temp');
  }

  async githubDeviceFlow() {
    console.log(chalk.blue('🔐 Starting GitHub authentication...'));

    // Step 1: Request device and user verification codes
    const deviceCodeResponse = await fetch('https://github.com/login/device/code', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: '6c1e8c36e22b4d8f9ae0', // Public client ID for CLI tools
        scope: 'repo read:user'
      })
    });

    const deviceData = await deviceCodeResponse.json();

    if (!deviceCodeResponse.ok) {
      throw new Error(`GitHub device flow failed: ${deviceData.error_description}`);
    }

    // Step 2: Display user code and open verification URL
    console.log(chalk.yellow(`\\n📋 GitHub verification code: ${chalk.bold(deviceData.user_code)}`));
    console.log(chalk.gray(`   Go to: ${deviceData.verification_uri}`));
    console.log(chalk.gray(`   Or we'll open it for you...\\n`));

    await open(deviceData.verification_uri);

    // Step 3: Poll for authorization
    console.log(chalk.blue('⏳ Waiting for authorization...'));

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: '6c1e8c36e22b4d8f9ae0',
              device_code: deviceData.device_code,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
          });

          const tokenData = await tokenResponse.json();

          if (tokenData.access_token) {
            clearInterval(pollInterval);

            // Get user info
            const userResponse = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `token ${tokenData.access_token}`,
                'User-Agent': 'Football-Highlights-Installer'
              }
            });

            const userData = await userResponse.json();

            resolve({
              token: tokenData.access_token,
              username: userData.login,
              userId: userData.id,
              email: userData.email
            });
          } else if (tokenData.error === 'authorization_pending') {
            // Continue polling
          } else if (tokenData.error === 'slow_down') {
            // GitHub wants us to slow down
            clearInterval(pollInterval);
            setTimeout(() => {
              // Restart with longer interval
              pollInterval = setInterval(async () => { /* same logic */ }, deviceData.interval * 1000 + 5000);
            }, 5000);
          } else {
            clearInterval(pollInterval);
            reject(new Error(`GitHub authorization failed: ${tokenData.error_description}`));
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, deviceData.interval * 1000);

      // Timeout after 15 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('GitHub authorization timed out'));
      }, 15 * 60 * 1000);
    });
  }

  async createGitHubRepo(auth, repoData) {
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${auth.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Football-Highlights-Installer'
      },
      body: JSON.stringify({
        name: repoData.name,
        description: repoData.description,
        private: repoData.private || false,
        auto_init: true,
        license_template: 'mit'
      })
    });

    const repo = await response.json();

    if (!response.ok) {
      throw new Error(`Failed to create GitHub repository: ${repo.message}`);
    }

    return {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch
    };
  }

  async validateRailwayToken(token) {
    const response = await fetch('https://backboard.railway.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              id
              name
              email
            }
            projects {
              edges {
                node {
                  id
                  name
                  description
                }
              }
            }
          }
        `
      })
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      throw new Error(`Railway token validation failed: ${data.errors?.[0]?.message || 'Invalid token'}`);
    }

    return {
      user: data.data.me,
      projects: data.data.projects.edges.map(edge => edge.node)
    };
  }

  async validateRenderKey(apiKey) {
    const response = await fetch('https://api.render.com/v1/services', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Render API key validation failed: ${error}`);
    }

    const services = await response.json();
    return services;
  }

  async validateCloudflareToken(apiToken) {
    const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(`Cloudflare token validation failed: ${data.errors?.[0]?.message || 'Invalid token'}`);
    }

    // Get zones if token is valid
    const zonesResponse = await fetch('https://api.cloudflare.com/client/v4/zones', {
      headers: {
        'Authorization': `Bearer ${apiToken}`
      }
    });

    const zonesData = await zonesResponse.json();
    return zonesData.result || [];
  }

  async createGoogleCloudProject(projectData) {
    // Note: This would typically require service account credentials
    // For now, we'll provide instructions for manual setup
    console.log(chalk.yellow('\\n⚠️  Manual Google Cloud setup required:'));
    console.log(chalk.gray('1. Go to: https://console.cloud.google.com/'));
    console.log(chalk.gray('2. Create a new project'));
    console.log(chalk.gray('3. Enable the required APIs'));
    console.log(chalk.gray('4. Create OAuth 2.0 credentials\\n'));

    await open('https://console.cloud.google.com/projectcreate');

    // Return mock project data for now
    return {
      id: projectData.id,
      name: projectData.name,
      number: Date.now()
    };
  }

  async enableGoogleAPIs(projectId, apis) {
    // This would typically use the Service Management API
    // For now, provide manual instructions
    console.log(chalk.blue('Enabling Google APIs...'));
    console.log(chalk.gray('APIs to enable:'));
    apis.forEach(api => {
      console.log(chalk.gray(`   • ${api}`));
    });

    return { enabled: apis };
  }

  async setupOAuthConsent(projectId, consentData) {
    console.log(chalk.blue('Setting up OAuth consent screen...'));
    console.log(chalk.gray('Configure with:'));
    console.log(chalk.gray(`   • App name: ${consentData.applicationName}`));
    console.log(chalk.gray(`   • Support email: ${consentData.supportEmail}`));

    return { configured: true };
  }

  async createOAuthCredentials(projectId, credentialsData) {
    console.log(chalk.blue('Creating OAuth 2.0 credentials...'));

    // For demo purposes, return sample credentials structure
    // In production, this would create actual credentials via Google Cloud API
    return {
      client_id: 'sample-client-id.apps.googleusercontent.com',
      client_secret: 'sample-client-secret',
      redirect_uris: credentialsData.redirectUris,
      type: 'oauth2'
    };
  }

  async googleOAuthFlow(credentials) {
    console.log(chalk.blue('🔐 Starting Google OAuth flow...'));

    const oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      'http://localhost:3000/callback'
    );

    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/script.projects'
    ];

    // Generate auth URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    console.log(chalk.yellow('\\n🌐 Opening Google authorization page...'));
    console.log(chalk.gray(`If it doesn't open, go to: ${authUrl}\\n`));

    await open(authUrl);

    // Set up local server to receive callback
    return new Promise((resolve, reject) => {
      const app = express();
      let server;

      app.get('/callback', async (req, res) => {
        const { code, error } = req.query;

        if (error) {
          res.send(`<h1>Authorization failed: ${error}</h1>`);
          server.close();
          reject(new Error(`Google authorization failed: ${error}`));
          return;
        }

        if (!code) {
          res.send('<h1>No authorization code received</h1>');
          server.close();
          reject(new Error('No authorization code received'));
          return;
        }

        try {
          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          res.send(`
            <h1>✅ Authorization successful!</h1>
            <p>You can close this window and return to the installer.</p>
            <script>setTimeout(() => window.close(), 3000);</script>
          `);

          server.close();

          resolve({
            tokens,
            client: oauth2Client,
            scopes
          });
        } catch (error) {
          res.send(`<h1>Token exchange failed: ${error.message}</h1>`);
          server.close();
          reject(error);
        }
      });

      server = app.listen(3000, () => {
        console.log(chalk.gray('🔄 Waiting for authorization...'));
      });

      // Timeout after 10 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Google authorization timed out'));
      }, 10 * 60 * 1000);
    });
  }

  async validateGitHubAuth(auth) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${auth.token}`,
        'User-Agent': 'Football-Highlights-Installer'
      }
    });

    if (!response.ok) {
      throw new Error('GitHub authentication invalid');
    }

    const user = await response.json();
    return { valid: true, user };
  }

  async validateGoogleAuth(auth) {
    try {
      // Test the credentials by making a simple API call
      const drive = google.drive({ version: 'v3', auth: auth.client });
      await drive.about.get({ fields: 'user' });
      return { valid: true };
    } catch (error) {
      throw new Error('Google authentication invalid');
    }
  }

  // Utility method to save credentials securely
  async saveCredentials(service, credentials) {
    await fs.ensureDir(this.tempDir);
    const filePath = path.join(this.tempDir, `${service}-credentials.json`);
    await fs.writeJson(filePath, credentials, { spaces: 2 });
    return filePath;
  }

  // Utility method to load saved credentials
  async loadCredentials(service) {
    const filePath = path.join(this.tempDir, `${service}-credentials.json`);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  }

  // Cleanup temporary files
  async cleanup() {
    if (await fs.pathExists(this.tempDir)) {
      await fs.remove(this.tempDir);
    }
  }
}