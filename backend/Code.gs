/**
 * backend/Code.gs
 * Headless REST API Gateway for Google Sheets Database.
 * Product: Engineering Monthly Report System - Agranusa Signature Villa
 * 
 * Note: Google Sheets functions purely as the database.
 * The frontend UI is hosted separately on Vercel and deployed to GitHub & PWA Builder.
 */

/**
 * Handles HTTP GET requests.
 * Always returns JSON with CORS headers.
 */
function doGet(e) {
  e = e || { parameter: {} };
  const action = e.parameter.action || 'ping';
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

  const result = (action === 'ping') 
    ? { success: true, message: 'Agranusa Engineering GAS API is active', version: APP_CONFIG.APP_VERSION }
    : ApiRouter.dispatch(action, payload);

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles HTTP POST requests for external API clients (Vercel Serverless / Frontend).
 * Always returns JSON with CORS headers.
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

    if (!action) {
      throw new Error("Parameter 'action' wajib disertakan.");
    }

    responseData = ApiRouter.dispatch(action, payload);
  } catch (err) {
    responseData = {
      success: false,
      error: err.message || 'Gagal memproses request API.'
    };
  }

  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Custom spreadsheet menu when opening Google Sheets directly
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
