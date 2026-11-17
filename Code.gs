/**
 * Code.gs
 * Web App Entry Point, REST API Gateway, and Custom Spreadsheet Menu.
 * Product: Engineering Monthly Report System - Agranusa Signature Villa
 */

/**
 * Handles HTTP GET requests.
 * Can serve the Web UI or act as a REST API endpoint.
 */
function doGet(e) {
  e = e || { parameter: {} };

  // If action parameter is provided, respond as REST API
  if (e.parameter && e.parameter.action) {
    const action = e.parameter.action;
    let payload = {};
    if (e.parameter.payload) {
      try {
        payload = JSON.parse(e.parameter.payload);
      } catch (err) {
        payload = e.parameter;
      }
    } else {
      payload = e.parameter;
    }
    const result = ApiRouter.dispatch(action, payload);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Otherwise serve the HTML Web App
  const template = HtmlService.createTemplateFromFile('Index');
  return template.evaluate()
    .setTitle('Agranusa Engineering System')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Handles HTTP POST requests for external API clients (e.g. Vercel frontend).
 */
function doPost(e) {
  let responseData = {};
  try {
    let action = '';
    let payload = {};

    if (e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents);
      action = body.action;
      payload = body.payload || body;
    } else if (e.parameter) {
      action = e.parameter.action;
      payload = e.parameter;
    }

    responseData = ApiRouter.dispatch(action, payload);
  } catch (err) {
    responseData = {
      success: false,
      error: err.message || 'Gagal memproses request POST.'
    };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Direct RPC bridge for google.script.run inside Web App
 */
function apiCall(action, payload) {
  return ApiRouter.dispatch(action, payload);
}

/**
 * Helper to include partial HTML files if needed
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Creates custom Google Sheets menu when opening the spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Agranusa Engineering')
    .addItem('🚀 Inisialisasi Database (13 Tab)', 'menuInitDatabase')
    .addItem('📊 Jalankan Evaluasi Otomatis', 'menuRunEvaluation')
    .addItem('📄 Export Laporan Bulanan (PDF)', 'menuExportPdf')
    .addToUi();
}

function menuInitDatabase() {
  const res = SheetRepository.initDatabase();
  SpreadsheetApp.getUi().alert('Inisialisasi Database', res.message, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuRunEvaluation() {
  const res = EvaluationService.generate(APP_CONFIG.DEFAULT_PERIOD);
  SpreadsheetApp.getUi().alert('Evaluasi Otomatis', `Selesai: ${res.totalFindings} temuan dievaluasi untuk periode ${res.period}.`, SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuExportPdf() {
  const res = ReportService.exportPdf(APP_CONFIG.DEFAULT_PERIOD);
  SpreadsheetApp.getUi().alert('Export Laporan PDF', `Laporan berhasil dibuat!\nFile: ${res.fileUrl || 'Tersimpan di Google Drive'}`, SpreadsheetApp.getUi().ButtonSet.OK);
}
