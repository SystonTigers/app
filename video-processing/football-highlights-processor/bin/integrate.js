#!/usr/bin/env node

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { InstallerIntegration } from '../integration/installer-integration.js';

async function main() {
  console.clear();
  console.log(chalk.blue.bold('🔗 Football Highlights - Integration Setup'));
  console.log(chalk.blue('='.repeat(50)));
  console.log();

  console.log(chalk.yellow('This tool will integrate the video processor with your installed system.'));
  console.log(chalk.gray('Make sure you have already run: npx create-football-highlights'));
  console.log();

  const integration = new InstallerIntegration();

  // Step 1: Validate installer setup
  const spinner1 = ora('Checking installer configuration...').start();
  try {
    const validation = await integration.validateInstallerIntegration();

    if (!validation.valid) {
      spinner1.fail('Installer validation failed');
      console.log(chalk.red(`\\n❌ ${validation.error}`));
      console.log(chalk.yellow('\\n💡 Please run the installer first: npx create-football-highlights'));
      process.exit(1);
    }

    spinner1.succeed('Installer configuration found and valid');

    const { config } = validation.data;
    console.log(chalk.cyan(`\\n✅ Found configuration for: ${config.clubName}`));
    console.log(chalk.gray(`   Season: ${config.season}`));
    console.log(chalk.gray(`   Region: ${config.region}`));
  } catch (error) {
    spinner1.fail('Validation failed');
    console.error(chalk.red(`\\n❌ Error: ${error.message}`));
    process.exit(1);
  }

  // Step 2: Generate configurations
  const spinner2 = ora('Generating processor configuration...').start();
  try {
    const validation = await integration.validateInstallerIntegration();
    const processorConfig = integration.generateProcessorConfig(validation.data);
    const managementIntegration = await integration.createManagementIntegration(validation.data);

    spinner2.succeed('Configuration generated');

    console.log(chalk.cyan('\\n📋 Generated Configuration:'));
    console.log(chalk.white(`   Club: ${processorConfig.club.name} (${processorConfig.club.season})`));
    console.log(chalk.white(`   Processing Quality: ${processorConfig.processing.quality}`));
    console.log(chalk.white(`   Worker Concurrency: ${processorConfig.processing.concurrency}`));
    console.log(chalk.white(`   Region: ${processorConfig.club.region}`));

    // Step 3: Save integration files
    const spinner3 = ora('Saving integration files...').start();
    const savedFiles = await integration.saveIntegrationFiles(processorConfig, managementIntegration);
    spinner3.succeed('Integration files saved');

    console.log(chalk.green('\\n✅ Integration files created:'));
    Object.entries(savedFiles).forEach(([key, path]) => {
      console.log(chalk.gray(`   ${key}: ${path}`));
    });

  } catch (error) {
    spinner2.fail('Configuration generation failed');
    console.error(chalk.red(`\\n❌ Error: ${error.message}`));
    process.exit(1);
  }

  // Step 4: Test integration
  const { testIntegration } = await inquirer.prompt([{
    type: 'confirm',
    name: 'testIntegration',
    message: 'Test integration connectivity?',
    default: true
  }]);

  if (testIntegration) {
    const spinner4 = ora('Testing integration connectivity...').start();
    try {
      const testResult = await integration.testIntegration();

      if (testResult.success) {
        spinner4.succeed('Integration test passed');

        console.log(chalk.green('\\n✅ Integration Test Results:'));
        console.log(chalk.white(`   Endpoint Connectivity: ${testResult.connectivity.healthy}/${testResult.connectivity.total}`));
        console.log(chalk.white(`   Health Ratio: ${(testResult.connectivity.ratio * 100).toFixed(1)}%`));

        if (testResult.connectivity.ratio >= 0.67) {
          console.log(chalk.green('   Status: Ready for production'));
        } else {
          console.log(chalk.yellow('   Status: Some endpoints unreachable (check deployments)'));
        }
      } else {
        spinner4.fail('Integration test failed');
        console.log(chalk.red(`\\n❌ ${testResult.error}`));
      }
    } catch (error) {
      spinner4.fail('Integration test error');
      console.error(chalk.red(`\\n❌ Error: ${error.message}`));
    }
  }

  // Step 5: Show deployment instructions
  console.log(chalk.blue.bold('\\n🚀 Deployment Instructions'));
  console.log(chalk.blue('='.repeat(30)));
  console.log();

  console.log(chalk.yellow('1. Docker Deployment:'));
  console.log(chalk.white('   cd football-highlights-system/integration'));
  console.log(chalk.white('   docker-compose up -d'));
  console.log();

  console.log(chalk.yellow('2. Manual Deployment:'));
  console.log(chalk.white('   cp integration/.env.production .env'));
  console.log(chalk.white('   npm start'));
  console.log();

  console.log(chalk.yellow('3. Railway/Render Deployment:'));
  console.log(chalk.white('   Upload the .env.production file as environment variables'));
  console.log(chalk.white('   Deploy using your existing Railway/Render configuration'));
  console.log();

  console.log(chalk.cyan('💡 Your management sheet is ready at:'));
  const validation = await integration.validateInstallerIntegration();
  const managementIntegration = await integration.createManagementIntegration(validation.data);
  console.log(chalk.white(`   https://docs.google.com/spreadsheets/d/${managementIntegration.sheets.managementId}`));
  console.log();

  console.log(chalk.green.bold('✅ Integration setup complete!'));
  console.log(chalk.gray('Your video processing system is now integrated with your installation.'));
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\\n❌ Unhandled error:'), error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\\n\\n⏸️  Integration cancelled by user'));
  process.exit(0);
});

// Run the main function
main().catch(error => {
  console.error(chalk.red('\\n❌ Integration failed:'), error.message);
  process.exit(1);
});