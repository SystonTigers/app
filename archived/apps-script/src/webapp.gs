// ===== Provisioning Web App (GAS) =====
// SECURITY: Set a strong secret and the approved template ID.
const HMAC_SECRET = 'REPLACE_WITH_STRONG_SHARED_SECRET';
const TEMPLATE_SPREADSHEET_ID = '1YourTemplateSpreadsheetId'; // same as wrangler var

function doPost(e) {
  const raw = (e.postData && e.postData.contents) || '';
  const headerSig = (e.headers && (e.headers['x-signature'] || e.headers['X-Signature'])) || '';
  if (!verifySignature_(raw, headerSig)) {
    return json_({ ok: false, error: 'bad_signature' }, 401);
  }

  try {
    const req = JSON.parse(raw);
    const action = req.action;

    if (action === 'provision') {
      const tplId = req.templateSpreadsheetId;
      if (tplId && tplId !== TEMPLATE_SPREADSHEET_ID) throw new Error('template_mismatch');

      // 1) Copy template
      const title = `${req.teamName} – Automation`;
      const newFile = DriveApp.getFileById(TEMPLATE_SPREADSHEET_ID).makeCopy(title);
      const spreadsheetId = newFile.getId();

      // 2) Write CONFIG
      if (req.config) writeConfig_(spreadsheetId, req.config);

      // 3) Set Script Properties
      const props = req.properties || {};
      props['SYSTEM.SPREADSHEET_ID'] = spreadsheetId;
      PropertiesService.getScriptProperties().setProperties(props, true);

      // 4) Run installer if present
      if (typeof CustomerInstaller !== 'undefined' && CustomerInstaller.installFromSheet) {
        CustomerInstaller.installFromSheet();
      }

      // 5) Validate
      const report = typeof validateEnvironment === 'function'
        ? validateEnvironment()
        : { note: 'validateEnvironment() not found' };

      return json_({ ok: true, spreadsheetId, report });
    }

    if (action === 'verify') {
      const spreadsheetId = req.spreadsheetId;
      if (!spreadsheetId) throw new Error('missing_spreadsheetId');
      const report = typeof validateEnvironment === 'function'
        ? validateEnvironment()
        : { note: 'validateEnvironment() not found' };
      return json_({ ok: true, report });
    }

    return json_({ ok: false, error: 'unknown_action' }, 400);
  } catch (err) {
    console.error('Provisioning error', err);
    return json_({ ok: false, error: String(err) }, 500);
  }
}

// --- helpers ---
function verifySignature_(rawBody, signature) {
  if (!signature) return false;
  const mac = Utilities.computeHmacSha256Signature(rawBody, HMAC_SECRET);
  const webSafe = Utilities.base64EncodeWebSafe(mac).replace(/=+$/g, '');
  return webSafe === signature;
}

function writeConfig_(spreadsheetId, kv) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let sh = ss.getSheetByName('CONFIG');
  if (!sh) sh = ss.insertSheet('CONFIG');
  const rows = Object.keys(kv).map(k => [k, String(kv[k] ?? '')]);
  rows.unshift(['Key', 'Value']);
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
}

function json_(obj, status) {
  const o = ContentService.createTextOutput(JSON.stringify(obj));
  o.setMimeType(ContentService.MimeType.JSON);
  if (status) {
    // Apps Script can't set arbitrary status; we encode in body only.
  }
  return o;
}
