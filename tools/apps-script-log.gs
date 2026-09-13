/**
 * Google Apps Script endpoint for the Kanji Bertahap answer log.
 *
 * Paste this whole file into Extensions → Apps Script of the Google Sheet
 * that will hold the data, then deploy it as a Web App (see README,
 * "Pengiriman log ke Google Apps Script").
 *
 * - Rows are appended to the sheet named SHEET_NAME (created if missing).
 * - Columns are matched by name; new columns sent by a newer app version are
 *   added to the header automatically.
 * - Rows whose rowId already exists are skipped, so a batch that is sent twice
 *   after a network drop does not create duplicates.
 * - Every cell is stored as plain text; values that start with = + - @ get a
 *   leading apostrophe so Sheets never runs them as formulas.
 */

var SHEET_NAME = "log";
var APP_ID = "kanji-bertahap";

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.app !== APP_ID || !Array.isArray(payload.columns) || !Array.isArray(payload.rows)) {
      return jsonResponse({ ok: false, error: "format data tidak dikenal" });
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

    var header = sheet.getLastRow() === 0 ? [] : sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var newColumns = payload.columns.concat(["receivedAt"]).filter(function (name) {
      return header.indexOf(name) === -1;
    });
    if (newColumns.length) {
      sheet.getRange(1, header.length + 1, 1, newColumns.length).setValues([newColumns]);
      header = header.concat(newColumns);
    }

    var rowIdColumn = header.indexOf("rowId");
    var existing = {};
    if (sheet.getLastRow() > 1) {
      sheet
        .getRange(2, rowIdColumn + 1, sheet.getLastRow() - 1, 1)
        .getValues()
        .forEach(function (row) {
          existing[String(row[0])] = true;
        });
    }

    var receivedAt = new Date().toISOString();
    var output = [];
    payload.rows.forEach(function (values) {
      var record = {};
      payload.columns.forEach(function (name, i) {
        record[name] = values[i];
      });
      var rowId = String(record.rowId || "");
      if (rowId && existing[rowId]) return;
      existing[rowId] = true;
      record.receivedAt = receivedAt;
      output.push(
        header.map(function (name) {
          return asText(record[name]);
        })
      );
    });

    if (output.length) {
      var range = sheet.getRange(sheet.getLastRow() + 1, 1, output.length, header.length);
      range.setNumberFormat("@");
      range.setValues(output);
    }
    return jsonResponse({ ok: true, received: payload.rows.length, appended: output.length });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Opening the Web App URL in a browser shows whether the endpoint is alive. */
function doGet() {
  return jsonResponse({ ok: true, message: "Endpoint log Kanji Bertahap aktif." });
}

function asText(value) {
  if (value === undefined || value === null) return "";
  var text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(object) {
  return ContentService.createTextOutput(JSON.stringify(object)).setMimeType(ContentService.MimeType.JSON);
}
