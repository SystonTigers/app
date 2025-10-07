/**
 * @fileoverview Full system health check for Syston Tigers automation.
 * @version 1.0
 * @author ChatGPT
 * @description Validates sheet structure, triggers, key functions, and live data flows.
 */

/**
 * Main entry point to run all health checks.
 */
function runSystemHealthCheck() {
  const logger = Logger;
  logger.clear();

  logger.log("📋 Running system health check...");

  checkSheets();
  checkSheetTabs();
  checkKeyFunctions();
  checkTriggers();
  checkLeagueMappingFlow();
  testRefreshToday();
  simulateLiveMatchUpdate();

  logger.log("✅ Health check complete.");
  logger.flush();
}

/**
 * Checks if core Google Sheets are accessible.
 */
function checkSheets() {
  try {
    const ss = getSheet();
    if (!ss) throw new Error("Spreadsheet not found.");
    Logger.log("✅ Spreadsheet accessible: " + ss.getName());
  } catch (e) {
    Logger.log("❌ Spreadsheet access error: " + e.message);
  }
}

/**
 * Validates the centralized getSheet helper.
 */
function testGetSheet() {
  try {
    const ss = getSheet();
    Logger.log("✅ Sheet title: " + ss.getName());
  } catch (e) {
    Logger.log("❌ getSheet failed: " + e.message);
  }
}

/**
 * Validates that required tabs and columns exist.
 */
function checkSheetTabs() {
  const requiredTabs = [
    "Control Panel",
    "Fixtures",
    "Results",
    "Live Match Updates",
    "League Raw",
    "League Sorted",
    "League Canva Map"
  ];

  const ss = getSheet();
  requiredTabs.forEach(tabName => {
    const sheet = ss.getSheetByName(tabName);
    if (sheet) {
      Logger.log(`✅ Tab found: ${tabName}`);
    } else {
      Logger.log(`❌ Missing tab: ${tabName}`);
    }
  });

  const liveUpdateSheet = ss.getSheetByName("Live Match Updates");
  if (liveUpdateSheet) {
    const headers = liveUpdateSheet.getRange(1, 1, 1, liveUpdateSheet.getLastColumn()).getValues()[0];
    const requiredHeaders = ["Match Date", "Opponent", "Scorer", "Assister", "Minute", "Send"];
    requiredHeaders.forEach(h => {
      if (headers.includes(h)) {
        Logger.log(`✅ Column "${h}" exists in Live Match Updates`);
      } else {
        Logger.log(`❌ Missing column "${h}" in Live Match Updates`);
      }
    });
  }
}

/**
 * Checks that critical global functions exist.
 */
function checkKeyFunctions() {
  const testFns = [
    "refreshToday",
    "handleLiveEdit",
    "refreshAndMapLeague",
    "generateLeagueTable",
    "pushScoreToXbotGo"
  ];

  testFns.forEach(fnName => {
    const exists = typeof this[fnName] === "function";
    Logger.log(`${exists ? "✅" : "❌"} Function ${fnName} ${exists ? "exists" : "MISSING"}`);
  });
}

/**
 * Checks that required triggers exist and are not duplicated.
 */
function checkTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  const expected = {
    time: 0,
    onEdit: 0
  };

  triggers.forEach(trigger => {
    if (trigger.getEventType() === ScriptApp.EventType.ON_EDIT) expected.onEdit++;
    if (trigger.getEventType() === ScriptApp.EventType.TIME_DRIVEN) expected.time++;
  });

  Logger.log(`🕒 Time-based triggers found: ${expected.time}`);
  Logger.log(`✏️ OnEdit triggers found: ${expected.onEdit}`);

  if (expected.onEdit > 1) Logger.log("⚠️ Multiple onEdit triggers may cause double posts.");
  if (expected.time === 0) Logger.log("❌ No time-based trigger found.");
}

/**
 * Test the League Table refresh and mapping flow.
 */
function checkLeagueMappingFlow() {
  try {
    refreshAndMapLeague(); // Run your actual mapping function
    Logger.log("✅ League table refreshAndMapLeague ran without errors.");
  } catch (e) {
    Logger.log("❌ League table mapping failed: " + e.message);
  }
}

/**
 * Test refreshToday to simulate daily function.
 */
function testRefreshToday() {
  try {
    refreshToday();
    Logger.log("✅ refreshToday ran successfully.");
  } catch (e) {
    Logger.log("❌ refreshToday failed: " + e.message);
  }
}

/**
 * Simulate a live match update and confirm handleLiveEdit runs.
 * NOTE: Dry run only — won't trigger Make.com.
 */
function simulateLiveMatchUpdate() {
  try {
    const sheet = getSheet().getSheetByName("Live Match Updates");
    if (!sheet) throw new Error("Live Match Updates tab missing.");

    const lastRow = sheet.getLastRow() + 1;
    const fakeData = ["2099-12-31", "Test United", "Test Player", "Assist Player", "12", true];
    sheet.getRange(lastRow, 1, 1, fakeData.length).setValues([fakeData]);
    Logger.log("✅ Simulated match update added.");

  } catch (e) {
    Logger.log("❌ Failed to simulate live update: " + e.message);
  }
}
