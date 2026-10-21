/**
 * Credit Dost Diwali — Google Sheets admin sync (Apps Script web app).
 *
 * Setup:
 *  1. Open your Google Sheet → Extensions → Apps Script. Replace Code.gs with this file.
 *  2. Project Settings (gear) → Script properties → Add property:
 *       SYNC_SECRET = <same long random value as SHEETS_WEBHOOK_SECRET in server/.env>
 *  3. Deploy → New deployment → type "Web app":
 *       Execute as: Me    Who has access: Anyone
 *     Copy the Web app URL (ends in /exec) into SHEETS_WEBHOOK_URL in server/.env.
 *  4. After editing this script later: Deploy → Manage deployments → Edit → Version: New version
 *     (the /exec URL stays the same).
 *
 * The server POSTs { secret, rows: [...] }. One row per lead, matched on Lead ID:
 * existing rows are updated in place, new leads are appended.
 */

var SHEET_NAME = 'Diwali Leads';

// [header, field key from the server, keep-as-text?]
var COLUMNS = [
  ['Lead ID', 'leadId', true],
  ['Registered At (IST)', 'registeredAt', true],
  ['Offer', 'offer', true],
  ['Name', 'name', true],
  ['Mobile', 'mobile', true],
  ['Email', 'email', true],
  ['City', 'city', true],
  ['PIN', 'pin', true],
  ['Amount (₹ incl. GST)', 'amount', false],
  ['GST (₹)', 'gst', false],
  ['Payment Status', 'paymentStatus', true],
  ['Razorpay Order ID', 'orderId', true],
  ['Razorpay Payment ID', 'paymentId', true],
  ['Paid At (IST)', 'paidAt', true],
  ['Failure Reason', 'failureReason', true],
  ['Confirmed Via', 'paidVia', true],
  ['Traffic Source', 'source', true],
  ['Last Updated (IST)', 'lastUpdated', true],
];

var STATUS_COLUMN = 11; // 1-based index of "Payment Status"

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = PropertiesService.getScriptProperties().getProperty('SYNC_SECRET');
    if (!expected || body.secret !== expected) {
      return json_({ ok: false, error: 'Unauthorized' });
    }
    var rows = Array.isArray(body.rows) ? body.rows : [];
    if (rows.length === 0) return json_({ ok: true, inserted: 0, updated: 0 });

    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return json_(upsertRows_(rows));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// Visiting the /exec URL in a browser is a quick health check
function doGet() {
  return json_({ ok: true, service: 'credit-dost-sheets-sync' });
}

function upsertRows_(rows) {
  var sheet = getOrCreateSheet_();
  var lastRow = sheet.getLastRow();

  // Map Lead ID → sheet row number
  var index = {};
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (ids[i][0]) index[String(ids[i][0])] = i + 2;
    }
  }

  var inserted = 0;
  var updated = 0;
  var appendValues = [];

  rows.forEach(function (row) {
    if (!row || !row.leadId) return;
    var values = COLUMNS.map(function (c) {
      var v = row[c[1]];
      return v === null || v === undefined ? '' : v;
    });
    var existing = index[String(row.leadId)];
    if (existing) {
      sheet.getRange(existing, 1, 1, COLUMNS.length).setValues([values]);
      updated++;
    } else {
      appendValues.push(values);
      index[String(row.leadId)] = -1; // guard duplicate ids within one batch
      inserted++;
    }
  });

  if (appendValues.length > 0) {
    var start = sheet.getLastRow() + 1;
    sheet.getRange(start, 1, appendValues.length, COLUMNS.length).setValues(appendValues);
  }

  return { ok: true, inserted: inserted, updated: updated };
}

function getOrCreateSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  sheet = ss.insertSheet(SHEET_NAME);
  var headers = COLUMNS.map(function (c) { return c[0]; });
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground('#2c1a66')
    .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // Text format keeps leading zeros/long IDs intact and stops formulas being evaluated
  var maxRows = sheet.getMaxRows();
  COLUMNS.forEach(function (c, i) {
    if (c[2]) sheet.getRange(2, i + 1, maxRows - 1, 1).setNumberFormat('@');
  });

  // Colour-code Payment Status
  var statusRange = sheet.getRange(2, STATUS_COLUMN, maxRows - 1, 1);
  var rule = function (text, bg, fg) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(text).setBackground(bg).setFontColor(fg)
      .setRanges([statusRange]).build();
  };
  sheet.setConditionalFormatRules([
    rule('Paid', '#e8f5e9', '#2e7d32'),
    rule('Payment Failed', '#ffebee', '#c62828'),
    rule('Amount Mismatch - Review', '#ffebee', '#c62828'),
    rule('Payment Started', '#fff8e1', '#b26a00'),
    rule('Registered - Not Paid', '#fff8e1', '#b26a00'),
    rule('Expired (Not Paid)', '#eeeeee', '#616161'),
    rule('Cancelled', '#eeeeee', '#616161'),
  ]);

  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
