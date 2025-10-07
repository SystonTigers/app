#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    }).trim();
  } catch (error) {
    const stdout = error.stdout?.toString?.().trim();
    const stderr = error.stderr?.toString?.().trim();
    if (stdout) {
      console.error(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
    throw new Error(`Failed to run ${command} ${args.join(' ')} (${error.message})`);
  }
}

function parseDeployments(jsonText) {
  try {
    const data = JSON.parse(jsonText);
    if (!Array.isArray(data)) {
      throw new Error('Unexpected deployments payload');
    }
    return data;
  } catch (error) {
    throw new Error(`Unable to parse clasp deployments output: ${error.message}`);
  }
}

function selectSingleWebAppDeployment(deployments) {
  const webAppDeployments = deployments.filter((deployment) => deployment?.deploymentConfig?.webApp);

  if (webAppDeployments.length === 0) {
    throw new Error('No Web App deployments found. Create one deployment in the Apps Script UI and rerun CI.');
  }

  if (webAppDeployments.length > 1) {
    const ids = webAppDeployments.map((deployment) => deployment.deploymentId).join(', ');
    throw new Error(`Multiple Web App deployments detected (${ids}). Delete extras before rerunning CI.`);
  }

  return webAppDeployments[0];
}

try {
  console.log('🔍 Inspecting Apps Script deployments...');
  const deploymentsOutput = run('npx', ['clasp', 'deployments', '--json']);
  const deployments = parseDeployments(deploymentsOutput);
  const targetDeployment = selectSingleWebAppDeployment(deployments);
  const deploymentId = targetDeployment.deploymentId;

  console.log(`🆔 Using Web App deployment: ${deploymentId}`);
  if (targetDeployment.deploymentConfig?.description) {
    console.log(`📄 Description: ${targetDeployment.deploymentConfig.description}`);
  }

  run('npx', ['clasp', 'deploy', '--deploymentId', deploymentId]);
  console.log('✅ Web App deployment updated successfully.');
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exitCode = 1;
}
