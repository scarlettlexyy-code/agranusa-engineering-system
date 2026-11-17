/**
 * SheetRepository.gs
 * Complete Data Access Layer (DAL) for Google Sheets Database.
 * Implements batch read/write, concurrency lock, automatic table creation,
 * and data integrity protection based on PRD Section 8.
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

const SheetRepository = {
  /**
   * Get the active Spreadsheet instance
   */
  getSpreadsheet: function() {
    const sheetId = ConfigService.getSpreadsheetId();
    if (sheetId) {
      try {
        return SpreadsheetApp.openById(sheetId);
      } catch (e) {
        console.warn('Could not open spreadsheet by ID: ' + e.message);
      }
    }
    
    // Fallback: try active spreadsheet
    try {
      const active = SpreadsheetApp.getActiveSpreadsheet();
      if (active) return active;
    } catch (e) {}

    // Fallback: create a new one automatically and save its ID
    const newSheet = SpreadsheetApp.create('Agranusa Engineering Database');
    ConfigService.setSpreadsheetId(newSheet.getId());
    return newSheet;
  },

  /**
   * Get or create a specific sheet tab by name
   */
  getSheet: function(tabName) {
    const ss = this.getSpreadsheet();
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
      const headers = SCHEMAS[tabName];
      if (headers) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#004d40').setFontColor('#ffffff');
        sheet.setFrozenRows(1);
      }
    }
    return sheet;
  },

  /**
   * Read all records from a table as an array of objects
   */
  getAll: function(tabName) {
    const sheet = this.getSheet(tabName);
    const lastRow = sheet.getLastRow();
    const headers = SCHEMAS[tabName];
    if (lastRow <= 1) return [];

    const numCols = headers.length;
    const values = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();

    return values.map((row, index) => {
      const obj = { _row: index + 2 };
      headers.forEach((h, colIdx) => {
        let val = row[colIdx];
        if (val instanceof Date) {
          // Format date as YYYY-MM-DD for consistency
          val = Utilities.formatDate(val, APP_CONFIG.TIMEZONE, 'yyyy-MM-dd');
        }
        obj[h] = val;
      });
      return obj;
    });
  },

  /**
   * Filter records matching key-value pair
   */
  filter: function(tabName, key, value) {
    const all = this.getAll(tabName);
    return all.filter(r => String(r[key]) === String(value));
  },

  /**
   * Find single record matching key-value pair
   */
  find: function(tabName, key, value) {
    const all = this.getAll(tabName);
    return all.find(r => String(r[key]) === String(value)) || null;
  },

  /**
   * Insert a single record into table using LockService for concurrency
   */
  insert: function(tabName, record) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const sheet = this.getSheet(tabName);
      const headers = SCHEMAS[tabName];
      const rowValues = headers.map(h => (record[h] !== undefined && record[h] !== null) ? record[h] : '');
      sheet.appendRow(rowValues);
      SpreadsheetApp.flush();
      return record;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Insert multiple records in a batch
   */
  insertBatch: function(tabName, records) {
    if (!records || records.length === 0) return [];
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(15000);
      const sheet = this.getSheet(tabName);
      const headers = SCHEMAS[tabName];
      const rows = records.map(rec => headers.map(h => (rec[h] !== undefined && rec[h] !== null) ? rec[h] : ''));
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rows.length, headers.length).setValues(rows);
      SpreadsheetApp.flush();
      return records;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Update a record by key and value
   */
  update: function(tabName, key, value, updates) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const sheet = this.getSheet(tabName);
      const headers = SCHEMAS[tabName];
      const records = this.getAll(tabName);
      const target = records.find(r => String(r[key]) === String(value));
      if (!target) throw new Error(`Record with ${key} = ${value} not found in ${tabName}`);

      const rowIdx = target._row;
      const keyColIdx = headers.indexOf(key);

      headers.forEach((h, colIdx) => {
        if (updates[h] !== undefined) {
          sheet.getRange(rowIdx, colIdx + 1).setValue(updates[h]);
        }
      });

      SpreadsheetApp.flush();
      return Object.assign({}, target, updates);
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Delete a record by key
   */
  deleteRecord: function(tabName, key, value) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const sheet = this.getSheet(tabName);
      const records = this.getAll(tabName);
      const target = records.find(r => String(r[key]) === String(value));
      if (!target) return false;

      sheet.deleteRow(target._row);
      SpreadsheetApp.flush();
      return true;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Delete multiple records matching condition
   */
  deleteWhere: function(tabName, key, value) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const sheet = this.getSheet(tabName);
      const records = this.getAll(tabName);
      const targets = records.filter(r => String(r[key]) === String(value));
      
      // Delete from bottom to top to preserve row indices
      targets.sort((a, b) => b._row - a._row).forEach(t => {
        sheet.deleteRow(t._row);
      });
      SpreadsheetApp.flush();
      return true;
    } finally {
      lock.releaseLock();
    }
  },

  /**
   * Generate Next Sequential ID with Prefix
   * Example: ACT-202605-043, PRJ-2026-005, ENG-20260518-05
   */
  generateId: function(tabName, idField, prefix) {
    const records = this.getAll(tabName);
    const regex = new RegExp('^' + prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\d+)$');
    let maxNum = 0;
    records.forEach(r => {
      const match = String(r[idField] || '').match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = String(maxNum + 1).padStart(3, '0');
    return `${prefix}${nextNum}`;
  },

  /**
   * Initialize Entire Database Schema and Sample Master Data matching UI
   */
  initDatabase: function() {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(20000);
      const ss = this.getSpreadsheet();

      // Ensure each tab exists with schema headers
      Object.keys(SCHEMAS).forEach(tab => {
        this.getSheet(tab);
      });

      const now = new Date().toISOString();

      // Seed CONFIG if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.CONFIG).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.CONFIG, [
          { config_key: 'appName', config_value: 'Agranusa Engineering System', description: 'Application Name', updated_at: now },
          { config_key: 'appVersion', config_value: 'v2.4.0', description: 'Application Version', updated_at: now },
          { config_key: 'timezone', config_value: 'Asia/Makassar', description: 'Timezone (WITA)', updated_at: now },
          { config_key: 'company', config_value: 'Agranusa Signature Villa', description: 'Company Name', updated_at: now }
        ]);
      }

      // Seed USERS if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.USERS).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.USERS, [
          { user_id: 'USR-001', email: 'wayan.sudarma@agranusa.com', display_name: 'I Wayan Sudarma', role: 'Head of Engineering', is_active: true, created_at: now, updated_at: now },
          { user_id: 'USR-002', email: 'gm@agranusa.com', display_name: 'General Manager', role: 'Management', is_active: true, created_at: now, updated_at: now }
        ]);
      }

      // Seed EMPLOYEES if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.EMPLOYEES).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.EMPLOYEES, [
          { employee_id: 'EMP-01', employee_name: 'Wayan G.', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-02', employee_name: 'Made S.', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-03', employee_name: 'Ketut A.', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-04', employee_name: 'Komang D.', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-05', employee_name: 'Nyoman Sudiarta', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-06', employee_name: 'Ketut Wijaya', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-07', employee_name: 'Made Kartayasa', is_active: true, created_at: now, updated_at: now },
          { employee_id: 'EMP-08', employee_name: 'Gede Arimbawa', is_active: true, created_at: now, updated_at: now }
        ]);
      }

      // Seed LOCATIONS if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.LOCATIONS).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.LOCATIONS, [
          { location_id: 'LOC-01', location_name: 'Villa 12', is_active: true },
          { location_id: 'LOC-02', location_name: 'Central Plant', is_active: true },
          { location_id: 'LOC-03', location_name: 'Villa 08', is_active: true },
          { location_id: 'LOC-04', location_name: 'Genset House', is_active: true },
          { location_id: 'LOC-05', location_name: 'Public Area', is_active: true },
          { location_id: 'LOC-06', location_name: 'Kitchen', is_active: true },
          { location_id: 'LOC-07', location_name: 'Main Dining Pavilion', is_active: true },
          { location_id: 'LOC-08', location_name: 'Central Lagoon Area', is_active: true },
          { location_id: 'LOC-09', location_name: 'Public Walkway Perimeter', is_active: true }
        ]);
      }

      // Seed ENERGY_TARIFFS if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.ENERGY_TARIFFS).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.ENERGY_TARIFFS, [
          { tariff_id: 'TRF-001', category: 'Listrik PLN', unit: 'kWh', tariff_value: 1450, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true },
          { tariff_id: 'TRF-002', category: 'Air PDAM', unit: 'm³', tariff_value: 9000, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true },
          { tariff_id: 'TRF-003', category: 'Gas LPG', unit: 'kg', tariff_value: 9000, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true },
          { tariff_id: 'TRF-004', category: 'Fuel Genset', unit: 'Liter', tariff_value: 15000, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true }
        ]);
      }

      // Seed Sample PROJECTS (from UI Screenshot 4) if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.PROJECTS).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.PROJECTS, [
          {
            project_id: 'PRJ-2026-004',
            project_name: 'Upgrade Chillers & HVAC Villa Suite 01-08',
            objective: 'Meningkatkan efisiensi pendingin kamar tamu dan penurunan konsumsi daya kompresor',
            description: 'Pemasangan unit HVAC inverter berkapasitas tinggi di Villa 01-08',
            location_id: 'Villa Area Cluster Timur',
            start_date: '2026-05-02',
            target_end_date: '2026-05-28',
            owner: 'Made Kartayasa (HVAC Spec.)',
            budget: 45000000,
            project_cost: 38200000,
            progress: 75,
            status: 'In Progress',
            notes: '75% Instalasi unit ke-6. On Track. Hemat 15%',
            created_at: now,
            updated_at: now
          },
          {
            project_id: 'PRJ-2026-002',
            project_name: 'Renovasi Pipa Sirkulasi Main Pool',
            objective: 'Perbaikan sirkulasi kolam utama pasca kebocoran pipa bawah tanah',
            description: 'Penyambungan pipa dan penggantian valve high-grade sirkulasi Main Lagoon',
            location_id: 'Central Lagoon Area',
            start_date: '2026-04-25',
            target_end_date: '2026-05-22',
            owner: 'Gede Arimbawa (Plumbing)',
            budget: 20000000,
            project_cost: 22800000,
            progress: 90,
            status: 'In Progress',
            notes: 'Perhatian Khusus: Melebihi Anggaran (-Rp 2.800.000 / Defisit +14.0%). Diperlukan memo justifikasi Capex.',
            created_at: now,
            updated_at: now
          },
          {
            project_id: 'PRJ-2026-001',
            project_name: 'Instalasi Smart Timer Penerangan Koridor',
            objective: 'Automasi penyalaan lampu koridor hemat energi',
            description: 'Pemasangan photocell timer dan sensor cahaya koridor',
            location_id: 'Public Walkway Perimeter',
            start_date: '2026-05-01',
            target_end_date: '2026-05-14',
            owner: 'Nyoman Sudiarta (Electrical)',
            budget: 12000000,
            project_cost: 11200000,
            progress: 100,
            status: 'Completed',
            notes: '100% Testing BA Closed. Hemat Rp 800.000',
            created_at: now,
            updated_at: now
          },
          {
            project_id: 'PRJ-2026-006',
            project_name: 'Waterproofing & Retiling Atap Restoran',
            objective: 'Pencegahan rembesan musim hujan di Main Dining Pavilion',
            description: 'Pembongkaran parsial dan pelapisan membran bakar',
            location_id: 'Main Dining Pavilion',
            start_date: '2026-05-26',
            target_end_date: '2026-06-18',
            owner: 'Ketut Wijaya (Civil & Structure)',
            budget: 35000000,
            project_cost: 5250000,
            progress: 15,
            status: 'Planning',
            notes: '15% Pembongkaran parsial. Menunggu pengiriman material.',
            created_at: now,
            updated_at: now
          }
        ]);
      }

      // Seed Sample ACTIVITIES (from UI Screenshot 1) if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.ACTIVITIES).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.ACTIVITIES, [
          {
            activity_id: 'ACT-202605-042',
            activity_date: '2026-05-19',
            reporting_period: '2026-05',
            input_mode: 'Daily',
            weekly_period_start: '',
            weekly_period_end: '',
            job_name: 'Penggantian Seal Mechanical Pompa Kolam',
            location_id: 'Villa 12',
            description: 'Ditemukan kebocoran air pada area seal impeller pompa sirkulasi.',
            status: 'Pending',
            notes: 'Menunggu sparepart mechanical seal dari supplier Denpasar',
            created_by: 'USR-001',
            created_at: now,
            updated_at: now
          },
          {
            activity_id: 'ACT-202605-041',
            activity_date: '2026-05-19',
            reporting_period: '2026-05',
            input_mode: 'Weekly',
            weekly_period_start: '2026-05-18',
            weekly_period_end: '2026-05-24',
            job_name: 'Overhaul & Kalibrasi Valve Chiller Unit 1',
            location_id: 'Central Plant',
            description: 'Pemeriksaan sensor suhu inlet water dan penggantian gasket selenoid.',
            status: 'In Progress',
            notes: 'Tahap pressure testing s.d. sore ini',
            created_by: 'USR-001',
            created_at: now,
            updated_at: now
          },
          {
            activity_id: 'ACT-202605-040',
            activity_date: '2026-05-18',
            reporting_period: '2026-05',
            input_mode: 'Daily',
            weekly_period_start: '',
            weekly_period_end: '',
            job_name: 'Flushing Water Heater Solar & Backup Tank',
            location_id: 'Villa 08',
            description: 'Pembersihan kerak kapur pada tabung pemanas dan drainase sedimen.',
            status: 'Done',
            notes: 'Selesai 100%, temperatur air stabil 60°C',
            created_by: 'USR-001',
            created_at: now,
            updated_at: now
          },
          {
            activity_id: 'ACT-202605-039',
            activity_date: '2026-05-18',
            reporting_period: '2026-05',
            input_mode: 'Daily',
            weekly_period_start: '',
            weekly_period_end: '',
            job_name: 'Uji Beban Rutin Genset Perkins 250 kVA & ATS Panel',
            location_id: 'Genset House',
            description: 'Pengetesan simulasi blackout 15 menit dengan beban operasional penuh.',
            status: 'Done',
            notes: 'Level solar tangki harian 820 Liter, tegangan 385V stabil',
            created_by: 'USR-001',
            created_at: now,
            updated_at: now
          },
          {
            activity_id: 'ACT-202605-038',
            activity_date: '2026-05-17',
            reporting_period: '2026-05',
            input_mode: 'Daily',
            weekly_period_start: '',
            weekly_period_end: '',
            job_name: 'Penggantian Papan Deck Kayu Ulin Gazebo Pool',
            location_id: 'Public Area',
            description: '3 lembar papan melengkung dan paku lepas diganti ulin baru.',
            status: 'Pending',
            notes: 'Area sedang dipakai wedding setup. Pengerjaan dilanjutkan besok pagi.',
            created_by: 'USR-001',
            created_at: now,
            updated_at: now
          },
          {
            activity_id: 'ACT-202605-037',
            activity_date: '2026-05-17',
            reporting_period: '2026-05',
            input_mode: 'Weekly',
            weekly_period_start: '2026-05-11',
            weekly_period_end: '2026-05-17',
            job_name: 'Deep Cleaning & Pemipaan Bio-Enzim Grease Trap',
            location_id: 'Kitchen',
            description: 'Penyedotan endapan lemak padat dan flushing pipa pembuangan resto.',
            status: 'In Progress',
            notes: 'Dikerjakan shift malam pukul 23:00 pasca tutup resto',
            created_by: 'USR-001',
            created_at: now,
            updated_at: now
          }
        ]);

        // Seed Activity Workers
        this.insertBatch(APP_CONFIG.SHEET_TABS.ACTIVITY_WORKERS, [
          { activity_worker_id: 'AW-01', activity_id: 'ACT-202605-042', employee_id: 'Wayan G.' },
          { activity_worker_id: 'AW-02', activity_id: 'ACT-202605-042', employee_id: 'Made S.' },
          { activity_worker_id: 'AW-03', activity_id: 'ACT-202605-041', employee_id: 'Made S.' },
          { activity_worker_id: 'AW-04', activity_id: 'ACT-202605-041', employee_id: 'Ketut A.' },
          { activity_worker_id: 'AW-05', activity_id: 'ACT-202605-040', employee_id: 'Komang D.' },
          { activity_worker_id: 'AW-06', activity_id: 'ACT-202605-039', employee_id: 'Wayan G.' },
          { activity_worker_id: 'AW-07', activity_id: 'ACT-202605-039', employee_id: 'Komang D.' },
          { activity_worker_id: 'AW-08', activity_id: 'ACT-202605-038', employee_id: 'Ketut A.' },
          { activity_worker_id: 'AW-09', activity_id: 'ACT-202605-037', employee_id: 'Komang D.' },
          { activity_worker_id: 'AW-10', activity_id: 'ACT-202605-037', employee_id: 'Ketut A.' }
        ]);
      }

      // Seed Sample ENERGY_DAILY (from UI Screenshot 3) if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.ENERGY_DAILY).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.ENERGY_DAILY, [
          {
            energy_record_id: 'ENG-20260518-01',
            category: 'Listrik PLN',
            record_date: '2026-05-18',
            input_method: 'Meter Reading',
            usage_value: 920,
            meter_reading: 143770,
            unit: 'kWh',
            tariff_id: 'TRF-001',
            calculated_cost: 1334000,
            validation_status: 'Valid',
            notes: 'Normal, beban villa penuh',
            created_at: now,
            updated_at: now
          },
          {
            energy_record_id: 'ENG-20260516-04',
            category: 'Air PDAM',
            record_date: '2026-05-16',
            input_method: 'Meter Reading',
            usage_value: 98,
            meter_reading: 18440,
            unit: 'm³',
            tariff_id: 'TRF-002',
            calculated_cost: 882000,
            validation_status: 'Anomali',
            notes: 'Spike +35 m³ vs rata-rata harian 61 m³. Investigasi kebocoran pipa bawah tanah.',
            created_at: now,
            updated_at: now
          },
          {
            energy_record_id: 'ENG-20260516-02',
            category: 'Gas LPG',
            record_date: '2026-05-16',
            input_method: 'Daily Usage',
            usage_value: 30,
            meter_reading: '',
            unit: 'kg',
            tariff_id: 'TRF-003',
            calculated_cost: 270000,
            validation_status: 'Valid',
            notes: 'Restoran & Bakery operasional normal',
            created_at: now,
            updated_at: now
          },
          {
            energy_record_id: 'ENG-20260515-03',
            category: 'Fuel Genset',
            record_date: '2026-05-15',
            input_method: 'Daily Usage',
            usage_value: 35,
            meter_reading: '',
            unit: 'Liter',
            tariff_id: 'TRF-004',
            calculated_cost: 525000,
            validation_status: 'Valid',
            notes: 'Uji beban rutin 15 menit',
            created_at: now,
            updated_at: now
          },
          {
            energy_record_id: 'ENG-20260515-01',
            category: 'Air PDAM',
            record_date: '2026-05-15',
            input_method: 'Meter Reading',
            usage_value: 58,
            meter_reading: 18342,
            unit: 'm³',
            tariff_id: 'TRF-002',
            calculated_cost: 522000,
            validation_status: 'Valid',
            notes: 'Pengisian tandon atas',
            created_at: now,
            updated_at: now
          }
        ]);
      }

      // Seed PURCHASE_SUMMARY if empty
      if (this.getAll(APP_CONFIG.SHEET_TABS.PURCHASE_SUMMARY).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.PURCHASE_SUMMARY, [
          {
            purchase_summary_id: 'PUR-202604',
            reporting_period: '2026-04',
            total_amount: 32500000,
            description: 'Belanja suku cadang operasional AC, bahan kimia kolam, sparepart genset bulan April',
            notes: 'Realisasi sesuai plafon belanja operasional bulanan',
            created_at: now,
            updated_at: now
          },
          {
            purchase_summary_id: 'PUR-202605',
            reporting_period: '2026-05',
            total_amount: 35400000,
            description: 'Belanja pengadaan material perbaikan kolam, mechanical seal pompa, pelumas genset, dan chemical pool Mei',
            notes: 'Status Belanja (Opex) Terkendali — Hemat 8.7% dari alokasi budget',
            created_at: now,
            updated_at: now
          }
        ]);
      }

      // Seed Sample EVALUATION_RESULTS (matching screenshot 2 temuan evaluasi)
      if (this.getAll(APP_CONFIG.SHEET_TABS.EVALUATION_RESULTS).length === 0) {
        this.insertBatch(APP_CONFIG.SHEET_TABS.EVALUATION_RESULTS, [
          {
            evaluation_id: 'EVL-202605-01',
            reporting_period: '2026-05',
            evaluation_category: 'Energy',
            title: 'Anomali Air PDAM',
            finding: 'Lonjakan pemakaian di Villa Cluster B (+14.2% vs baseline).',
            actual_value: '98 m³ (16 Mei)',
            comparison_value: '61 m³ (Rata-rata)',
            severity: 'Perhatian',
            recommendation: 'Inspeksi grounding pipe sirkulasi dan solenoid valve tandon B.',
            generated_at: now
          },
          {
            evaluation_id: 'EVL-202605-02',
            reporting_period: '2026-05',
            evaluation_category: 'Project',
            title: 'Over Budget Pompa Sirkulasi (PRJ-2026-002)',
            finding: 'Biaya servis motor melampaui plafon awal (Total Rp 22.800.000 vs Rp 20.000.000).',
            actual_value: 'Rp 22.800.000',
            comparison_value: 'Rp 20.000.000',
            severity: 'Perhatian',
            recommendation: 'Ajukan memo justifikasi Capex penyesuaian biaya penggantian valve pressure high-grade.',
            generated_at: now
          },
          {
            evaluation_id: 'EVL-202605-03',
            reporting_period: '2026-05',
            evaluation_category: 'Activity',
            title: 'HVAC Filter Replacement Selesai Tepat Waktu',
            finding: 'Pembersihan & penggantian media filter AHU Unit 01-08 selesai tanpa kendala.',
            actual_value: '100% Selesai',
            comparison_value: 'Target 100%',
            severity: 'Informasi',
            recommendation: 'Pertahankan jadwal preventative maintenance 2 mingguan.',
            generated_at: now
          }
        ]);
      }

      return { success: true, message: 'Database initialized successfully with all 13 tables and initial master data.' };
    } finally {
      lock.releaseLock();
    }
  }
};
