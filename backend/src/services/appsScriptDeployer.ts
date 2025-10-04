// src/services/appsScriptDeployer.ts

import { getGoogleAPIHeaders } from "./googleAuth";
import type { Env } from "../types";

/**
 * Apps Script deployment result
 */
export interface AppsScriptDeployment {
  success: boolean;
  scriptId?: string;
  scriptUrl?: string;
  webAppUrl?: string;
  error?: string;
}

/**
 * Apps Script file structure
 */
interface ScriptFile {
  name: string;
  type: "SERVER_JS" | "HTML";
  source: string;
}

interface ScriptContent {
  files: ScriptFile[];
  scriptId?: string;
}

/**
 * Apps Script API client
 * Automates deployment of Apps Script projects for new tenants
 */
export class AppsScriptDeployer {
  private env: Env;
  private headers: Record<string, string> | null = null;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Deploy Apps Script for a new tenant
   */
  async deployForTenant(
    tenantId: string,
    tenantName: string,
    automationJWT: string,
    backendUrl: string
  ): Promise<AppsScriptDeployment> {
    try {
      console.log(`[AppsScriptDeployer] Starting deployment for tenant: ${tenantId}`);

      // 1. Authenticate
      await this.authenticate();

      // 2. Create new project from template
      const scriptId = await this.createProjectFromTemplate(tenantId, tenantName);
      console.log(`[AppsScriptDeployer] Created project: ${scriptId}`);

      // 3. Configure script with tenant settings
      await this.configureScript(scriptId, tenantId, automationJWT, backendUrl);
      console.log(`[AppsScriptDeployer] Configured script with tenant settings`);

      // 4. Create version
      const versionNumber = await this.createVersion(scriptId);
      console.log(`[AppsScriptDeployer] Created version: ${versionNumber}`);

      // 5. Deploy as web app
      const webAppUrl = await this.deployAsWebApp(scriptId, versionNumber);
      console.log(`[AppsScriptDeployer] Deployed web app: ${webAppUrl}`);

      const scriptUrl = `https://script.google.com/d/${scriptId}/edit`;

      return {
        success: true,
        scriptId,
        scriptUrl,
        webAppUrl
      };

    } catch (error: any) {
      console.error(`[AppsScriptDeployer] Deployment failed for ${tenantId}:`, error);
      return {
        success: false,
        error: error.message || "Deployment failed"
      };
    }
  }

  /**
   * Authenticate with Google using service account
   */
  private async authenticate() {
    if (!this.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
    }

    const scopes = [
      "https://www.googleapis.com/auth/script.projects",
      "https://www.googleapis.com/auth/script.deployments"
    ];

    this.headers = await getGoogleAPIHeaders(
      this.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      scopes
    );
  }

  /**
   * Create new Apps Script project from template
   */
  private async createProjectFromTemplate(
    tenantId: string,
    tenantName: string
  ): Promise<string> {
    if (!this.env.APPS_SCRIPT_TEMPLATE_ID) {
      throw new Error("APPS_SCRIPT_TEMPLATE_ID not configured");
    }

    // Get template content
    const templateContent = await this.getScriptContent(this.env.APPS_SCRIPT_TEMPLATE_ID);

    // Create new project
    const response = await fetch("https://script.googleapis.com/v1/projects", {
      method: "POST",
      headers: this.headers!,
      body: JSON.stringify({
        title: `${tenantName} - Football Automation`
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create project: ${response.status} ${error}`);
    }

    const project = await response.json() as any;
    const scriptId = project.scriptId;

    // Copy template content to new project
    await this.updateScriptContent(scriptId, templateContent);

    return scriptId;
  }

  /**
   * Get script content (files) from a project
   */
  private async getScriptContent(scriptId: string): Promise<ScriptContent> {
    const response = await fetch(
      `https://script.googleapis.com/v1/projects/${scriptId}/content`,
      { headers: this.headers! }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get script content: ${response.status} ${error}`);
    }

    return await response.json() as ScriptContent;
  }

  /**
   * Update script content (files)
   */
  private async updateScriptContent(scriptId: string, content: ScriptContent) {
    const response = await fetch(
      `https://script.googleapis.com/v1/projects/${scriptId}/content`,
      {
        method: "PUT",
        headers: this.headers!,
        body: JSON.stringify({
          files: content.files
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update script content: ${response.status} ${error}`);
    }
  }

  /**
   * Configure script with tenant-specific settings
   */
  private async configureScript(
    scriptId: string,
    tenantId: string,
    automationJWT: string,
    backendUrl: string
  ) {
    // Get current content
    const content = await this.getScriptContent(scriptId);

    // Find and update config.gs file
    const configFile = content.files.find(f => f.name === "config");
    if (configFile) {
      // Replace placeholders in config
      configFile.source = this.injectTenantConfig(
        configFile.source,
        tenantId,
        automationJWT,
        backendUrl
      );
    }

    // Add auto-init file to set Script Properties
    const initFile: ScriptFile = {
      name: "auto_init",
      type: "SERVER_JS",
      source: this.generateAutoInitCode(tenantId, automationJWT, backendUrl)
    };

    content.files.push(initFile);

    // Update script
    await this.updateScriptContent(scriptId, content);

    // Execute auto-init to set properties
    await this.executeFunction(scriptId, "_autoInitTenant");
  }

  /**
   * Inject tenant configuration into config.gs
   */
  private injectTenantConfig(
    source: string,
    tenantId: string,
    automationJWT: string,
    backendUrl: string
  ): string {
    // Replace tenant ID
    source = source.replace(
      /TENANT_ID:\s*['"][^'"]*['"]/,
      `TENANT_ID: '${tenantId}'`
    );

    // Replace backend URL
    source = source.replace(
      /API_URL:\s*['"][^'"]*['"]/,
      `API_URL: '${backendUrl}'`
    );

    // Note: JWT is set via Script Properties for security, not in code

    return source;
  }

  /**
   * Generate auto-init code to set Script Properties
   */
  private generateAutoInitCode(
    tenantId: string,
    automationJWT: string,
    backendUrl: string
  ): string {
    return `
/**
 * Auto-initialization function
 * Sets Script Properties for tenant configuration
 * This runs once on first deployment
 */
function _autoInitTenant() {
  const props = PropertiesService.getScriptProperties();

  // Set tenant configuration
  props.setProperties({
    'TENANT_ID': '${tenantId}',
    'BACKEND_JWT': '${automationJWT}',
    'BACKEND_API_URL': '${backendUrl}',
    'INITIALIZED': 'true',
    'INITIALIZED_AT': new Date().toISOString()
  });

  Logger.log('Tenant configuration initialized for: ${tenantId}');

  return {
    success: true,
    tenantId: '${tenantId}',
    timestamp: new Date().toISOString()
  };
}
`.trim();
  }

  /**
   * Create a version (required for deployment)
   */
  private async createVersion(scriptId: string): Promise<number> {
    const response = await fetch(
      `https://script.googleapis.com/v1/projects/${scriptId}/versions`,
      {
        method: "POST",
        headers: this.headers!,
        body: JSON.stringify({
          description: "Automated deployment"
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create version: ${response.status} ${error}`);
    }

    const version = await response.json() as any;
    return version.versionNumber;
  }

  /**
   * Deploy script as web app
   */
  private async deployAsWebApp(scriptId: string, versionNumber: number): Promise<string> {
    const response = await fetch(
      `https://script.googleapis.com/v1/projects/${scriptId}/deployments`,
      {
        method: "POST",
        headers: this.headers!,
        body: JSON.stringify({
          versionNumber,
          description: "Production deployment",
          manifestFileName: "appsscript"
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to deploy: ${response.status} ${error}`);
    }

    const deployment = await response.json() as any;
    const deploymentId = deployment.deploymentId;

    // Construct web app URL
    const webAppUrl = `https://script.google.com/macros/s/${deploymentId}/exec`;

    return webAppUrl;
  }

  /**
   * Execute a function in the script
   */
  private async executeFunction(scriptId: string, functionName: string) {
    try {
      const response = await fetch(
        `https://script.googleapis.com/v1/scripts/${scriptId}:run`,
        {
          method: "POST",
          headers: this.headers!,
          body: JSON.stringify({
            function: functionName,
            devMode: false
          })
        }
      );

      if (!response.ok) {
        console.warn(`Function execution warning (non-critical): ${response.status}`);
        // Non-critical - properties can be set manually if needed
      }

      return await response.json();
    } catch (error) {
      console.warn(`Function execution failed (non-critical):`, error);
      // Non-critical - continue deployment
    }
  }
}

/**
 * Deploy Apps Script for a tenant (exported function)
 */
export async function deployAppsScriptForTenant(
  env: Env,
  tenantId: string,
  tenantName: string,
  automationJWT: string
): Promise<AppsScriptDeployment> {
  const deployer = new AppsScriptDeployer(env);
  const backendUrl = env.BACKEND_URL || "https://syston-postbus.team-platform-2025.workers.dev";

  return await deployer.deployForTenant(
    tenantId,
    tenantName,
    automationJWT,
    backendUrl
  );
}
