/**
 * File 2: 02_SeedData.gs
 * Fungsi: Mengisi Data Master & Data Awal Mei 2026 ke tab-tab yang sudah dibuat.
 * Waktu Eksekusi: ~2 detik.
 */

function isiDataAwal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date().toISOString();

  function insertRows(tabName, rows) {
    const s = ss.getSheetByName(tabName);
    if (!s || s.getLastRow() > 1 || rows.length === 0) return;
    const h = SCHEMAS[tabName];
    const data = rows.map(r => h.map(k => (r[k] !== undefined ? r[k] : '')));
    s.getRange(2, 1, data.length, h.length).setValues(data);
  }

  // 1. CONFIG
  insertRows('CONFIG', [
    { config_key: 'appName', config_value: 'Agranusa Engineering System', description: 'Nama Aplikasi', updated_at: now },
    { config_key: 'appVersion', config_value: 'v2.4.0', description: 'Versi', updated_at: now },
    { config_key: 'defaultPeriod', config_value: '2026-05', description: 'Periode', updated_at: now },
    { config_key: 'timezone', config_value: 'Asia/Makassar', description: 'Waktu WITA', updated_at: now }
  ]);

  // 2. USERS
  insertRows('USERS', [
    { user_id: 'USR-001', email: 'wayan.sudarma@agranusa.com', display_name: 'I Wayan Sudarma', role: 'Head of Engineering', is_active: true, created_at: now, updated_at: now },
    { user_id: 'USR-002', email: 'admin@agranusa.com', display_name: 'Admin Engineering', role: 'Admin', is_active: true, created_at: now, updated_at: now }
  ]);

  // 3. EMPLOYEES
  insertRows('EMPLOYEES', [
    { employee_id: 'Wayan G.', employee_name: 'I Wayan Gede', is_active: true, created_at: now, updated_at: now },
    { employee_id: 'Made S.', employee_name: 'I Made Sudana', is_active: true, created_at: now, updated_at: now },
    { employee_id: 'Ketut A.', employee_name: 'I Ketut Ardana', is_active: true, created_at: now, updated_at: now },
    { employee_id: 'Komang D.', employee_name: 'I Komang Darmawan', is_active: true, created_at: now, updated_at: now },
    { employee_id: 'Nyoman S.', employee_name: 'I Nyoman Sugiarta', is_active: true, created_at: now, updated_at: now }
  ]);

  // 4. LOCATIONS
  insertRows('LOCATIONS', [
    { location_id: 'Villa 12', location_name: 'Villa Unit 12', is_active: true },
    { location_id: 'Central Plant', location_name: 'Chiller & Central Mechanical Plant', is_active: true },
    { location_id: 'Villa 08', location_name: 'Villa Unit 08', is_active: true },
    { location_id: 'Genset House', location_name: 'Powerhouse & Genset Room', is_active: true },
    { location_id: 'Public Area', location_name: 'Public Walkway & Main Lagoon Pool', is_active: true },
    { location_id: 'Kitchen', location_name: 'Main Restaurant Kitchen & Grease Trap', is_active: true }
  ]);

  // 5. ENERGY_TARIFFS
  insertRows('ENERGY_TARIFFS', [
    { tariff_id: 'TRF-001', category: 'Listrik PLN', unit: 'kWh', tariff_value: 1450, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true },
    { tariff_id: 'TRF-002', category: 'Air PDAM', unit: 'm³', tariff_value: 9000, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true },
    { tariff_id: 'TRF-003', category: 'Gas LPG', unit: 'kg', tariff_value: 9000, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true },
    { tariff_id: 'TRF-004', category: 'Fuel Genset', unit: 'Liter', tariff_value: 15000, effective_from: '2026-01-01', effective_to: '2026-12-31', is_active: true }
  ]);

  // 6. ACTIVITIES
  insertRows('ACTIVITIES', [
    { activity_id: 'ACT-202605-042', activity_date: '2026-05-19', reporting_period: '2026-05', input_mode: 'Daily', job_name: 'Penggantian Seal Mechanical Pompa Kolam', location_id: 'Villa 12', description: 'Ditemukan kebocoran air pada seal', status: 'Pending', notes: 'Menunggu sparepart spare-kit dari Denpasar', created_by: 'USR-001', created_at: now, updated_at: now },
    { activity_id: 'ACT-202605-041', activity_date: '2026-05-19', reporting_period: '2026-05', input_mode: 'Weekly', job_name: 'Overhaul & Kalibrasi Valve Chiller Unit 1', location_id: 'Central Plant', description: 'Pemeriksaan sensor suhu inlet water', status: 'In Progress', notes: 'Tahap pressure testing s.d. sore ini', created_by: 'USR-001', created_at: now, updated_at: now },
    { activity_id: 'ACT-202605-040', activity_date: '2026-05-18', reporting_period: '2026-05', input_mode: 'Daily', job_name: 'Flushing Water Heater Solar & Backup Tank', location_id: 'Villa 08', description: 'Pembersihan kerak kapur pada tangki', status: 'Done', notes: 'Selesai 100%, temperatur air stabil 60°C', created_by: 'USR-001', created_at: now, updated_at: now },
    { activity_id: 'ACT-202605-039', activity_date: '2026-05-18', reporting_period: '2026-05', input_mode: 'Daily', job_name: 'Uji Beban Rutin Genset Perkins 250 kVA & ATS Panel', location_id: 'Genset House', description: 'Pengetesan simulasi blackout 15 menit', status: 'Done', notes: 'Level solar tangki harian 820 Liter, baterai starter 26.4 V', created_by: 'USR-001', created_at: now, updated_at: now },
    { activity_id: 'ACT-202605-038', activity_date: '2026-05-17', reporting_period: '2026-05', input_mode: 'Daily', job_name: 'Penggantian Papan Deck Kayu Ulin Gazebo Pool', location_id: 'Public Area', description: '3 lembar papan melengkung & paku terangkat', status: 'Pending', notes: 'Area sedang dipakai wedding setup', created_by: 'USR-001', created_at: now, updated_at: now },
    { activity_id: 'ACT-202605-037', activity_date: '2026-05-17', reporting_period: '2026-05', input_mode: 'Weekly', job_name: 'Deep Cleaning & Pemipaan Bio-Enzim Grease Trap', location_id: 'Kitchen', description: 'Penyedotan endapan lemak padat bulanan', status: 'In Progress', notes: 'Dikerjakan shift malam pukul 23:00 pasca tutup resto', created_by: 'USR-001', created_at: now, updated_at: now }
  ]);

  // 7. ACTIVITY_WORKERS
  insertRows('ACTIVITY_WORKERS', [
    { activity_worker_id: 'AW-001', activity_id: 'ACT-202605-042', employee_id: 'Wayan G.' },
    { activity_worker_id: 'AW-002', activity_id: 'ACT-202605-042', employee_id: 'Made S.' },
    { activity_worker_id: 'AW-003', activity_id: 'ACT-202605-041', employee_id: 'Made S.' },
    { activity_worker_id: 'AW-004', activity_id: 'ACT-202605-041', employee_id: 'Ketut A.' },
    { activity_worker_id: 'AW-005', activity_id: 'ACT-202605-040', employee_id: 'Komang D.' },
    { activity_worker_id: 'AW-006', activity_id: 'ACT-202605-039', employee_id: 'Wayan G.' },
    { activity_worker_id: 'AW-007', activity_id: 'ACT-202605-039', employee_id: 'Komang D.' }
  ]);

  // 8. PROJECTS
  insertRows('PROJECTS', [
    { project_id: 'PRJ-2026-004', project_name: 'Upgrade Chillers & HVAC Villa Suite 01-08', objective: 'Efisiensi Daya AC', description: 'Penggantian unit kompresor inverter R410A', location_id: 'Villa Suite 01-08', start_date: '2026-05-02', target_end_date: '2026-05-28', owner: 'Made Kertayasa', budget: 45000000, project_cost: 38200000, progress: 75, status: 'In Progress', notes: 'Instalasi unit ke-6 berjalan on track', created_at: now, updated_at: now },
    { project_id: 'PRJ-2026-002', project_name: 'Renovasi Pipa Sirkulasi Main Pool', objective: 'Perbaikan Kebocoran', description: 'Pemasangan pipa PVC tekanan tinggi AW & valve', location_id: 'Main Pool', start_date: '2026-04-25', target_end_date: '2026-05-22', owner: 'Gede Arimbawa', budget: 20000000, project_cost: 22800000, progress: 90, status: 'In Progress', notes: 'Over budget Rp 2.800.000', created_at: now, updated_at: now },
    { project_id: 'PRJ-2026-001', project_name: 'Instalasi Smart Timer Penerangan Koridor', objective: 'Otomasi Lampu Koridor', description: 'Pemasangan digital timer switch 16 channel', location_id: 'Public Walkway', start_date: '2026-05-01', target_end_date: '2026-05-14', owner: 'Nyoman Sudiarta', budget: 12000000, project_cost: 11200000, progress: 100, status: 'Completed', notes: 'Testing BAST closed', created_at: now, updated_at: now }
  ]);

  // 9. ENERGY_DAILY
  insertRows('ENERGY_DAILY', [
    { energy_record_id: 'ENG-20260518-01', category: 'Listrik PLN', record_date: '2026-05-18', input_method: 'Meter Reading', usage_value: 920, meter_reading: 143770, unit: 'kWh', tariff_id: 'TRF-001', calculated_cost: 1334000, validation_status: 'Valid', notes: 'Normal, beban villa penuh', created_at: now, updated_at: now },
    { energy_record_id: 'ENG-20260516-04', category: 'Air PDAM', record_date: '2026-05-16', input_method: 'Meter Reading', usage_value: 98, meter_reading: 18440, unit: 'm³', tariff_id: 'TRF-002', calculated_cost: 882000, validation_status: 'Anomali', notes: 'Spike +35 m³', created_at: now, updated_at: now },
    { energy_record_id: 'ENG-20260516-02', category: 'Gas LPG', record_date: '2026-05-16', input_method: 'Daily Usage', usage_value: 30, meter_reading: '', unit: 'kg', tariff_id: 'TRF-003', calculated_cost: 270000, validation_status: 'Valid', notes: 'Restoran normal', created_at: now, updated_at: now },
    { energy_record_id: 'ENG-20260515-03', category: 'Fuel Genset', record_date: '2026-05-15', input_method: 'Daily Usage', usage_value: 35, meter_reading: '', unit: 'Liter', tariff_id: 'TRF-004', calculated_cost: 525000, validation_status: 'Valid', notes: 'Uji beban rutin 15 menit', created_at: now, updated_at: now }
  ]);

  // 10. PURCHASE_SUMMARY
  insertRows('PURCHASE_SUMMARY', [
    { purchase_summary_id: 'PUR-202604', reporting_period: '2026-04', total_amount: 32500000, description: 'Belanja suku cadang AC April', notes: 'Sesuai plafon', created_at: now, updated_at: now },
    { purchase_summary_id: 'PUR-202605', reporting_period: '2026-05', total_amount: 35400000, description: 'Belanja seal pompa dan genset Mei', notes: 'Opex terkendali', created_at: now, updated_at: now }
  ]);

  // 11. EVALUATION_RESULTS
  insertRows('EVALUATION_RESULTS', [
    { evaluation_id: 'EVL-202605-01', reporting_period: '2026-05', evaluation_category: 'Energy', title: 'Anomali Air PDAM', finding: 'Lonjakan di Villa Cluster B (+14.2%).', actual_value: '98 m³ (16 Mei)', comparison_value: '61 m³ (Rata-rata)', severity: 'Perhatian', recommendation: 'Inspeksi pipa sirkulasi.', generated_at: now },
    { evaluation_id: 'EVL-202605-02', reporting_period: '2026-05', evaluation_category: 'Project', title: 'Over Budget Pompa Sirkulasi (PRJ-2026-002)', finding: 'Biaya servis melampaui plafon.', actual_value: 'Rp 22.800.000', comparison_value: 'Rp 20.000.000', severity: 'Perhatian', recommendation: 'Ajukan memo Capex.', generated_at: now }
  ]);

  Logger.log('SUKSES: Seluruh Data Master & Data Awal berhasil disimpan ke Spreadsheet!');
}
