/**
 * File 1: 01_DatabaseInit.gs
 * Fungsi: Membuat ke-13 Tab Spreadsheet beserta Header Kolomnya.
 * Waktu Eksekusi: ~2 detik.
 */

const SCHEMAS = {
  CONFIG: ['config_key', 'config_value', 'description', 'updated_at'],
  USERS: ['user_id', 'email', 'display_name', 'role', 'is_active', 'created_at', 'updated_at'],
  EMPLOYEES: ['employee_id', 'employee_name', 'is_active', 'created_at', 'updated_at'],
  LOCATIONS: ['location_id', 'location_name', 'is_active'],
  ACTIVITIES: ['activity_id', 'activity_date', 'reporting_period', 'input_mode', 'weekly_period_start', 'weekly_period_end', 'job_name', 'location_id', 'description', 'status', 'notes', 'created_by', 'created_at', 'updated_at'],
  ACTIVITY_WORKERS: ['activity_worker_id', 'activity_id', 'employee_id'],
  PROJECTS: ['project_id', 'project_name', 'objective', 'description', 'location_id', 'start_date', 'target_end_date', 'owner', 'budget', 'project_cost', 'progress', 'status', 'notes', 'created_at', 'updated_at'],
  ENERGY_DAILY: ['energy_record_id', 'category', 'record_date', 'input_method', 'usage_value', 'meter_reading', 'unit', 'tariff_id', 'calculated_cost', 'validation_status', 'notes', 'created_at', 'updated_at'],
  ENERGY_TARIFFS: ['tariff_id', 'category', 'unit', 'tariff_value', 'effective_from', 'effective_to', 'is_active'],
  PURCHASE_SUMMARY: ['purchase_summary_id', 'reporting_period', 'total_amount', 'description', 'notes', 'created_at', 'updated_at'],
  MONTHLY_REPORTS: ['report_id', 'reporting_period', 'report_status', 'generated_at', 'generated_by', 'pdf_file_reference', 'data_version'],
  EVALUATION_RESULTS: ['evaluation_id', 'reporting_period', 'evaluation_category', 'title', 'finding', 'actual_value', 'comparison_value', 'severity', 'recommendation', 'generated_at'],
  AUDIT_LOG: ['audit_id', 'user_id', 'action', 'entity_type', 'entity_id', 'previous_value', 'new_value', 'timestamp']
};

function buatSemuaTab() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMAS).forEach(name => {
    let s = ss.getSheetByName(name);
    if (!s) s = ss.insertSheet(name);
    if (s.getLastRow() === 0) {
      const h = SCHEMAS[name];
      s.getRange(1, 1, 1, h.length).setValues([h]);
      s.getRange(1, 1, 1, h.length).setBackground('#004d40').setFontColor('#ffffff').setFontWeight('bold');
      s.setFrozenRows(1);
    }
  });

  const d = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
  if (d && ss.getSheets().length > 1) {
    try { ss.deleteSheet(d); } catch (e) {}
  }
  Logger.log('SUKSES: Seluruh 13 Tab Database sudah selesai dibuat!');
}
