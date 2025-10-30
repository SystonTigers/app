function runAll() {
  const report = validateEnvironment();
  if (!report || report.overall_status === 'FAIL') {
    throw new Error('Environment validation failed: ' + JSON.stringify(report));
  }
  if (Array.isArray(report.errors) && report.errors.length > 0) {
    throw new Error('Environment validation errors detected: ' + JSON.stringify(report.errors));
  }

  let installerResult = null;
  if (typeof CustomerInstaller !== 'undefined' && typeof CustomerInstaller.installFromSheet === 'function') {
    installerResult = CustomerInstaller.installFromSheet();
    if (!installerResult || installerResult.success !== true) {
      throw new Error('Customer installer self-check failed: ' + JSON.stringify(installerResult));
    }
  }

  return {
    ok: true,
    report,
    installer: installerResult,
  };
}
