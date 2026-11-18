/**
 * _Globals.gs
 * ⚠️ File ini HARUS diload PERTAMA oleh Google Apps Script.
 * Underscore prefix (_) memastikan file ini load sebelum semua file lain secara alfabetis.
 *
 * Berisi: APP_CONFIG dan SCHEMAS yang digunakan oleh semua service files.
 * Product: Engineering Monthly Report System - Agranusa Signature Villa
 */

// =============================================================================
// APP_CONFIG — Konfigurasi global aplikasi
// =============================================================================
const APP_CONFIG = {
  APP_NAME: 'Agranusa Engineering System',
  APP_VERSION: 'v2.4.0',
  TIMEZONE: 'Asia/Makassar', // WITA
  DEFAULT_PERIOD: '2026-05',

  // Default Energy Tariffs (per unit)
  DEFAULT_TARIFFS: {
    'Listrik PLN': { unit: 'kWh', tariff: 1450 },
    'Air PDAM': { unit: 'm³', tariff: 9000 },
    'Gas LPG': { unit: 'kg', tariff: 9000 },
    'Fuel Genset': { unit: 'Liter', tariff: 15000 }
  },

  // Anomaly evaluation thresholds (percentage increase)
  THRESHOLDS: {
    ENERGY_SPIKE_PERCENT: 15.0,       // Alert if > 15% increase vs previous period
    COST_SPIKE_PERCENT: 10.0,
    PROJECT_OVER_BUDGET_PERCENT: 0.0, // Any over budget triggers warning
    ACTIVITY_TARGET_COMPLETION: 75.0  // Target completion rate > 75%
  },

  // Tab definitions in Google Sheets Database
  SHEET_TABS: {
    CONFIG: 'CONFIG',
    USERS: 'USERS',
    EMPLOYEES: 'EMPLOYEES',
    LOCATIONS: 'LOCATIONS',
    ACTIVITIES: 'ACTIVITIES',
    ACTIVITY_WORKERS: 'ACTIVITY_WORKERS',
    PROJECTS: 'PROJECTS',
    ENERGY_DAILY: 'ENERGY_DAILY',
    ENERGY_TARIFFS: 'ENERGY_TARIFFS',
    PURCHASE_SUMMARY: 'PURCHASE_SUMMARY',
    MONTHLY_REPORTS: 'MONTHLY_REPORTS',
    EVALUATION_RESULTS: 'EVALUATION_RESULTS',
    AUDIT_LOG: 'AUDIT_LOG'
  }
};

// =============================================================================
// SCHEMAS — Definisi kolom (header) setiap tab Google Sheets
// =============================================================================
const SCHEMAS = {
  CONFIG: ['config_key', 'config_value', 'description', 'updated_at'],
  USERS: ['user_id', 'email', 'display_name', 'role', 'is_active', 'created_at', 'updated_at'],
  EMPLOYEES: ['employee_id', 'employee_name', 'is_active', 'created_at', 'updated_at'],
  LOCATIONS: ['location_id', 'location_name', 'is_active'],
  ACTIVITIES: [
    'activity_id', 'activity_date', 'reporting_period', 'input_mode',
    'weekly_period_start', 'weekly_period_end', 'job_name', 'location_id',
    'description', 'status', 'notes', 'created_by', 'created_at', 'updated_at'
  ],
  ACTIVITY_WORKERS: ['activity_worker_id', 'activity_id', 'employee_id'],
  PROJECTS: [
    'project_id', 'project_name', 'objective', 'description', 'location_id',
    'start_date', 'target_end_date', 'owner', 'budget', 'project_cost',
    'progress', 'status', 'notes', 'created_at', 'updated_at'
  ],
  ENERGY_DAILY: [
    'energy_record_id', 'category', 'record_date', 'input_method',
    'usage_value', 'meter_reading', 'unit', 'tariff_id', 'calculated_cost',
    'validation_status', 'notes', 'created_at', 'updated_at'
  ],
  ENERGY_TARIFFS: ['tariff_id', 'category', 'unit', 'tariff_value', 'effective_from', 'effective_to', 'is_active'],
  PURCHASE_SUMMARY: ['purchase_summary_id', 'reporting_period', 'total_amount', 'description', 'notes', 'created_at', 'updated_at'],
  MONTHLY_REPORTS: ['report_id', 'reporting_period', 'report_status', 'generated_at', 'generated_by', 'pdf_file_reference', 'data_version'],
  EVALUATION_RESULTS: [
    'evaluation_id', 'reporting_period', 'evaluation_category', 'title',
    'finding', 'actual_value', 'comparison_value', 'severity',
    'recommendation', 'generated_at'
  ],
  AUDIT_LOG: ['audit_id', 'user_id', 'action', 'entity_type', 'entity_id', 'previous_value', 'new_value', 'timestamp']
};
