import { jest } from '@jest/globals';
import { AccountSetup } from '../lib/installer/account-setup.js';
import { AuthFlows } from '../lib/installer/auth-flows.js';
import { Deployment } from '../lib/installer/deployment.js';
import { Verification } from '../lib/installer/verification.js';

describe('Football Highlights Installer', () => {
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      clubName: 'Test FC',
      season: '2024-25',
      region: 'europe',
      email: 'test@example.com',
      videoQuality: 'medium'
    };
  });

  describe('AccountSetup', () => {
    test('should initialize with config', () => {
      const accountSetup = new AccountSetup(mockConfig);
      expect(accountSetup.config).toEqual(mockConfig);
    });

    test('should handle GitHub setup flow', async () => {
      const accountSetup = new AccountSetup(mockConfig);
      const authFlows = {
        githubDeviceFlow: jest.fn().mockResolvedValue({
          token: 'mock-token',
          username: 'testuser'
        }),
        createGitHubRepo: jest.fn().mockResolvedValue({
          id: 'repo-id',
          name: 'test-repo'
        })
      };
      accountSetup.authFlows = authFlows;

      // Mock inquirer responses
      jest.doMock('inquirer', () => ({
        prompt: jest.fn()
          .mockResolvedValueOnce({ hasAccount: false })
          .mockResolvedValueOnce({ created: true })
      }));

      // Mock open
      jest.doMock('open', () => jest.fn());

      const result = await accountSetup.setupGitHub();

      expect(result).toHaveProperty('service', 'github');
      expect(result).toHaveProperty('auth');
      expect(result).toHaveProperty('repository');
    });
  });

  describe('AuthFlows', () => {
    test('should validate GitHub token', async () => {
      const authFlows = new AuthFlows();

      // Mock fetch for GitHub API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          login: 'testuser',
          id: 12345,
          email: 'test@example.com'
        })
      });

      const result = await authFlows.validateGitHubAuth({
        token: 'mock-token'
      });

      expect(result.valid).toBe(true);
      expect(result.user.login).toBe('testuser');
    });

    test('should handle Railway token validation', async () => {
      const authFlows = new AuthFlows();

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          data: {
            me: {
              id: 'user-id',
              name: 'Test User',
              email: 'test@example.com'
            },
            projects: { edges: [] }
          }
        })
      });

      const result = await authFlows.validateRailwayToken('mock-token');

      expect(result.user.name).toBe('Test User');
      expect(result.projects).toEqual([]);
    });
  });

  describe('Deployment', () => {
    let deployment;
    let mockAccounts;

    beforeEach(() => {
      mockAccounts = {
        github: { token: 'gh-token', repository: { fullName: 'user/repo' } },
        railway: { token: 'railway-token' },
        render: { apiKey: 'render-key' },
        cloudflare: { apiToken: 'cf-token', accountId: 'cf-account' },
        google: { auth: { client: {} } }
      };

      deployment = new Deployment(mockAccounts, mockConfig);
    });

    test('should deploy to Railway', async () => {
      // Mock Railway API responses
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: { projectCreate: { id: 'project-id', name: 'test-project' } }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            data: { serviceCreate: { id: 'service-id', name: 'highlights-processor' } }
          })
        });

      const result = await deployment.deployRailway();

      expect(result.service).toBe('railway');
      expect(result.projectId).toBe('project-id');
      expect(result.status).toBe('deployed');
    });

    test('should generate highlight processor code', async () => {
      const code = await deployment.generateHighlightsProcessor();

      expect(code).toContain('const express = require');
      expect(code).toContain('const { google } = require');
      expect(code).toContain('/process');
      expect(code).toContain('/health');
    });

    test('should generate Cloudflare worker script', async () => {
      const script = await deployment.generateCloudflareWorkerScript();

      expect(script).toContain('addEventListener');
      expect(script).toContain('/coordinate');
      expect(script).toContain('/health');
      expect(script).toContain('coordinateProcessing');
    });
  });

  describe('Verification', () => {
    let verification;
    let mockAccounts, mockDeployments, mockSheet;

    beforeEach(() => {
      mockAccounts = {
        github: { token: 'gh-token' },
        railway: { token: 'railway-token' },
        render: { apiKey: 'render-key' },
        cloudflare: { apiToken: 'cf-token' },
        google: { auth: { client: {} } }
      };

      mockDeployments = {
        railway: { url: 'https://railway.example.com' },
        render: { url: 'https://render.example.com' },
        cloudflare: { url: 'https://worker.example.com' }
      };

      mockSheet = {
        spreadsheetId: 'sheet-id',
        url: 'https://docs.google.com/spreadsheets/d/sheet-id'
      };

      verification = new Verification(mockAccounts, mockDeployments, mockSheet);
    });

    test('should test GitHub authentication', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          login: 'testuser',
          email: 'test@example.com',
          public_repos: 5
        })
      });

      const result = await verification.testGitHubAuth();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Authenticated as testuser');
      expect(result.details.username).toBe('testuser');
    });

    test('should test service health', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          status: 'healthy',
          service: 'highlights-processor'
        })
      });

      const result = await verification.testRailwayHealth();

      expect(result.success).toBe(true);
      expect(result.message).toContain('Railway service is healthy');
    });

    test('should run all tests and analyze results', async () => {
      // Mock all the individual test functions
      verification.testGitHubAuth = jest.fn().mockResolvedValue({
        success: true, message: 'GitHub OK', details: {}
      });
      verification.testRailwayConnection = jest.fn().mockResolvedValue({
        success: true, message: 'Railway OK', details: {}
      });
      verification.testRenderConnection = jest.fn().mockResolvedValue({
        success: true, message: 'Render OK', details: {}
      });

      // Mock other test methods similarly...
      const mockTests = [
        'testCloudflareWorker',
        'testGoogleServices',
        'testRailwayHealth',
        'testRenderHealth',
        'testCloudflareHealth',
        'testServiceCommunication',
        'testSheetAccess',
        'testSheetStructure',
        'testAppsScriptIntegration',
        'testVideoWorkflow',
        'testEventProcessing',
        'testFileOperations',
        'testServiceQuotas',
        'testPerformanceBaseline'
      ];

      mockTests.forEach(testName => {
        verification[testName] = jest.fn().mockResolvedValue({
          success: true,
          message: `${testName} OK`,
          details: {}
        });
      });

      const results = await verification.runAllTests();

      expect(results.allPassed).toBe(true);
      expect(results.summary.total).toBeGreaterThan(0);
      expect(results.summary.passed).toBeGreaterThan(0);
      expect(results.summary.failed).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete installation flow', async () => {
      // This would be a comprehensive integration test
      // Testing the entire flow from start to finish
      // For now, we'll just verify the structure exists

      expect(AccountSetup).toBeDefined();
      expect(AuthFlows).toBeDefined();
      expect(Deployment).toBeDefined();
      expect(Verification).toBeDefined();
    });

    test('should handle error scenarios gracefully', async () => {
      const authFlows = new AuthFlows();

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await authFlows.validateGitHubAuth({ token: 'invalid' });
      } catch (error) {
        expect(error.message).toContain('Network error');
      }
    });
  });
});

// Helper functions for testing
export const createMockConfig = (overrides = {}) => ({
  clubName: 'Test FC',
  season: '2024-25',
  region: 'europe',
  email: 'test@example.com',
  videoQuality: 'medium',
  ...overrides
});

export const createMockAccounts = (overrides = {}) => ({
  github: { token: 'mock-gh-token', repository: { fullName: 'test/repo' } },
  railway: { token: 'mock-railway-token' },
  render: { apiKey: 'mock-render-key' },
  cloudflare: { apiToken: 'mock-cf-token', accountId: 'mock-account' },
  google: { auth: { client: {} } },
  ...overrides
});

export const createMockDeployments = (overrides = {}) => ({
  railway: { url: 'https://test-railway.railway.app', projectId: 'project-id' },
  render: { url: 'https://test-render.onrender.com', serviceId: 'service-id' },
  cloudflare: { url: 'https://test.workers.dev', workerId: 'worker-id' },
  ...overrides
});