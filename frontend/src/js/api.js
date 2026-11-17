/**
 * frontend/src/js/api.js
 * API Client that interfaces with Vercel Serverless Function / Google Apps Script.
 */

const API_ENDPOINT = (window.location.hostname === 'localhost' && !window.location.port.includes('3000'))
  ? '/api/gas'
  : (window.GAS_ENDPOINT || '/api/gas');

export const ApiClient = {
  /**
   * Send action and payload to Google Apps Script via Vercel proxy
   */
  async call(action, payload = {}) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, payload })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.warn(`[ApiClient] Call to '${action}' failed:`, err);
      // Fallback for offline demo testing
      return this.mockFallback(action, payload);
    }
  },

  /**
   * Offline demo fallback so app remains functional during offline testing or before GAS URL is set
   */
  mockFallback(action, payload) {
    if (action === 'dashboard.get') {
      return {
        success: true,
        kpiCards: {
          activities: { total: 148, done: 118, inProgress: 22, pending: 8, completionRate: 79.7 },
          projects: { total: 12, totalBudget: 185000000, totalCost: 142500000 },
          energy: { totalCost: 71762500, budgetPlafon: 78000000 },
          purchase: { totalAmount: 35400000 }
        }
      };
    }
    if (action === 'activity.list') {
      return {
        success: true,
        kpis: { total: 148, done: 118, inProgress: 22, pending: 8, completionRate: 79.7 },
        data: [
          { activity_id: 'ACT-202605-042', activity_date: '2026-05-19', input_mode: 'Daily', job_name: 'Penggantian Seal Mechanical Pompa Kolam', location_id: 'Villa 12', workers: ['Wayan G.', 'Made S.'], status: 'Pending', notes: 'Menunggu sparepart mechanical seal dari supplier Denpasar' },
          { activity_id: 'ACT-202605-041', activity_date: '2026-05-19', input_mode: 'Weekly', job_name: 'Overhaul & Kalibrasi Valve Chiller Unit 1', location_id: 'Central Plant', workers: ['Made S.', 'Ketut A.'], status: 'In Progress', notes: 'Tahap pressure testing s.d. sore ini' },
          { activity_id: 'ACT-202605-040', activity_date: '2026-05-18', input_mode: 'Daily', job_name: 'Flushing Water Heater Solar & Backup Tank', location_id: 'Villa 08', workers: ['Komang D.'], status: 'Done', notes: 'Selesai 100%, temperatur air stabil 60°C' },
          { activity_id: 'ACT-202605-039', activity_date: '2026-05-18', input_mode: 'Daily', job_name: 'Uji Beban Rutin Genset Perkins 250 kVA & ATS Panel', location_id: 'Genset House', workers: ['Wayan G.', 'Komang D.'], status: 'Done', notes: 'Level solar tangki harian 820 Liter, tegangan 385V stabil' },
          { activity_id: 'ACT-202605-038', activity_date: '2026-05-17', input_mode: 'Daily', job_name: 'Penggantian Papan Deck Kayu Ulin Gazebo Pool', location_id: 'Public Area', workers: ['Ketut A.'], status: 'Pending', notes: 'Area sedang dipakai wedding setup.' },
          { activity_id: 'ACT-202605-037', activity_date: '2026-05-17', input_mode: 'Weekly', job_name: 'Deep Cleaning & Pemipaan Bio-Enzim Grease Trap', location_id: 'Kitchen', workers: ['Komang D.', 'Ketut A.'], status: 'In Progress', notes: 'Dikerjakan shift malam pukul 23:00' }
        ]
      };
    }
    if (action === 'project.list') {
      return {
        success: true,
        kpis: { totalProjects: 12, totalBudget: 185000000, totalCost: 142500000, overBudgetCount: 1 },
        data: [
          { project_id: 'PRJ-2026-004', project_name: 'Upgrade Chillers & HVAC Villa Suite 01-08', location_id: 'Villa Area Cluster Timur', start_date: '2026-05-02', target_end_date: '2026-05-28', owner: 'Made Kartayasa (HVAC Spec.)', budget: 45000000, project_cost: 38200000, progress: 75, status: 'In Progress' },
          { project_id: 'PRJ-2026-002', project_name: 'Renovasi Pipa Sirkulasi Main Pool', location_id: 'Central Lagoon Area', start_date: '2026-04-25', target_end_date: '2026-05-22', owner: 'Gede Arimbawa (Plumbing)', budget: 20000000, project_cost: 22800000, progress: 90, status: 'In Progress' },
          { project_id: 'PRJ-2026-001', project_name: 'Instalasi Smart Timer Penerangan Koridor', location_id: 'Public Walkway Perimeter', start_date: '2026-05-01', target_end_date: '2026-05-14', owner: 'Nyoman Sudiarta (Electrical)', budget: 12000000, project_cost: 11200000, progress: 100, status: 'Completed' },
          { project_id: 'PRJ-2026-006', project_name: 'Waterproofing & Retiling Atap Restoran', location_id: 'Main Dining Pavilion', start_date: '2026-05-26', target_end_date: '2026-06-18', owner: 'Ketut Wijaya (Civil & Structure)', budget: 35000000, project_cost: 5250000, progress: 15, status: 'Planning' }
        ]
      };
    }
    if (action === 'energy.list') {
      return {
        success: true,
        data: [
          { energy_record_id: 'ENG-20260518-01', record_date: '2026-05-18', category: 'Listrik PLN', input_method: 'Meter Reading', meter_reading: '143770', usage_value: 920, unit: 'kWh', calculated_cost: 1334000, validation_status: 'Valid', notes: 'Normal, beban villa penuh' },
          { energy_record_id: 'ENG-20260516-04', record_date: '2026-05-16', category: 'Air PDAM', input_method: 'Meter Reading', meter_reading: '18440', usage_value: 98, unit: 'm³', calculated_cost: 882000, validation_status: 'Anomali', notes: 'Spike +35 m³ vs rata-rata harian 61 m³' },
          { energy_record_id: 'ENG-20260516-02', record_date: '2026-05-16', category: 'Gas LPG', input_method: 'Daily Usage', meter_reading: '', usage_value: 30, unit: 'kg', calculated_cost: 270000, validation_status: 'Valid', notes: 'Restoran & Bakery operasional normal' },
          { energy_record_id: 'ENG-20260515-03', record_date: '2026-05-15', category: 'Fuel Genset', input_method: 'Daily Usage', meter_reading: '', usage_value: 35, unit: 'Liter', calculated_cost: 525000, validation_status: 'Valid', notes: 'Uji beban rutin 15 menit' },
          { energy_record_id: 'ENG-20260515-01', record_date: '2026-05-15', category: 'Air PDAM', input_method: 'Meter Reading', meter_reading: '18342', usage_value: 58, unit: 'm³', calculated_cost: 522000, validation_status: 'Valid', notes: 'Pengisian tandon atas' }
        ]
      };
    }
    if (action === 'evaluation.get') {
      return {
        success: true,
        findings: [
          { evaluation_id: 'EVL-1', evaluation_category: 'Energy', title: 'Anomali Air PDAM', finding: 'Lonjakan pemakaian di Villa Cluster B (+14.2% vs baseline).', actual_value: '98 m³ (16 Mei)', comparison_value: '61 m³ (Rata-rata)', severity: 'Perhatian', recommendation: 'Inspeksi grounding pipe sirkulasi dan solenoid valve tandon B.' },
          { evaluation_id: 'EVL-2', evaluation_category: 'Project', title: 'Over Budget Pompa Sirkulasi (PRJ-2026-002)', finding: 'Biaya servis motor melampaui plafon awal (Total Rp 22.800.000 vs Rp 20.000.000).', actual_value: 'Rp 22.800.000', comparison_value: 'Rp 20.000.000', severity: 'Perhatian', recommendation: 'Ajukan memo justifikasi Capex penyesuaian biaya penggantian valve pressure high-grade.' },
          { evaluation_id: 'EVL-3', evaluation_category: 'Activity', title: 'HVAC Filter Replacement Selesai Tepat Waktu', finding: 'Pembersihan & penggantian media filter AHU Unit 01-08 selesai tanpa kendala.', actual_value: '100% Selesai', comparison_value: 'Target 100%', severity: 'Informasi', recommendation: 'Pertahankan jadwal preventative maintenance 2 mingguan.' }
        ]
      };
    }

    return { success: true, message: 'Operasi sukses (offline mode).' };
  }
};
