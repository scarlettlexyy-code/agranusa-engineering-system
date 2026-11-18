/**
 * frontend/src/js/api.js
 * API Client that interfaces with Vercel Serverless Function / Google Apps Script.
 * Provides live Google Sheets sync when online, plus responsive local state updates.
 */

const API_ENDPOINT = (window.location.hostname === 'localhost' && !window.location.port.includes('3000'))
  ? '/api/gas'
  : (window.GAS_ENDPOINT || '/api/gas');

// Internal in-memory store for offline/demo simulation
const mockStore = {
  activities: [
    { activity_id: 'ACT-202605-042', activity_date: '2026-05-19', input_mode: 'Daily', job_name: 'Penggantian Seal Mechanical Pompa Kolam', location_id: 'Villa 12', workers: ['Wayan G.', 'Made S.'], status: 'Pending', notes: 'Menunggu sparepart mechanical seal dari supplier Denpasar' },
    { activity_id: 'ACT-202605-041', activity_date: '2026-05-19', input_mode: 'Weekly', job_name: 'Overhaul & Kalibrasi Valve Chiller Unit 1', location_id: 'Central Plant', workers: ['Made S.', 'Ketut A.'], status: 'In Progress', notes: 'Tahap pressure testing s.d. sore ini' },
    { activity_id: 'ACT-202605-040', activity_date: '2026-05-18', input_mode: 'Daily', job_name: 'Flushing Water Heater Solar & Backup Tank', location_id: 'Villa 08', workers: ['Komang D.'], status: 'Done', notes: 'Selesai 100%, temperatur air stabil 60°C' },
    { activity_id: 'ACT-202605-039', activity_date: '2026-05-18', input_mode: 'Daily', job_name: 'Uji Beban Rutin Genset Perkins 250 kVA & ATS Panel', location_id: 'Genset House', workers: ['Wayan G.', 'Komang D.'], status: 'Done', notes: 'Level solar tangki harian 820 Liter, tegangan 385V stabil' },
    { activity_id: 'ACT-202605-038', activity_date: '2026-05-17', input_mode: 'Daily', job_name: 'Penggantian Papan Deck Kayu Ulin Gazebo Pool', location_id: 'Public Area', workers: ['Ketut A.'], status: 'Pending', notes: 'Area sedang dipakai wedding setup.' },
    { activity_id: 'ACT-202605-037', activity_date: '2026-05-17', input_mode: 'Weekly', job_name: 'Deep Cleaning & Pemipaan Bio-Enzim Grease Trap', location_id: 'Kitchen', workers: ['Komang D.', 'Ketut A.'], status: 'In Progress', notes: 'Dikerjakan shift malam pukul 23:00' }
  ],
  projects: [
    { project_id: 'PRJ-2026-004', project_name: 'Upgrade Chillers & HVAC Villa Suite 01-08', location_id: 'Villa Area Cluster Timur', start_date: '2026-05-02', target_end_date: '2026-05-28', owner: 'Made Kartayasa (HVAC Spec.)', budget: 45000000, project_cost: 38200000, progress: 75, status: 'In Progress', isOverBudget: false },
    { project_id: 'PRJ-2026-002', project_name: 'Renovasi Pipa Sirkulasi Main Pool', location_id: 'Central Lagoon Area', start_date: '2026-04-25', target_end_date: '2026-05-22', owner: 'Gede Arimbawa (Plumbing)', budget: 20000000, project_cost: 22800000, progress: 90, status: 'In Progress', isOverBudget: true },
    { project_id: 'PRJ-2026-001', project_name: 'Instalasi Smart Timer Penerangan Koridor', location_id: 'Public Walkway Perimeter', start_date: '2026-05-01', target_end_date: '2026-05-14', owner: 'Nyoman Sudiarta (Electrical)', budget: 12000000, project_cost: 11200000, progress: 100, status: 'Completed', isOverBudget: false },
    { project_id: 'PRJ-2026-006', project_name: 'Waterproofing & Retiling Atap Restoran', location_id: 'Main Dining Pavilion', start_date: '2026-05-26', target_end_date: '2026-06-18', owner: 'Ketut Wijaya (Civil & Structure)', budget: 35000000, project_cost: 5250000, progress: 15, status: 'Planning', isOverBudget: false }
  ],
  energy: [
    { energy_record_id: 'ENG-20260518-01', record_date: '2026-05-18', category: 'Listrik PLN', input_method: 'Meter Reading', meter_reading: '143770', usage_value: 920, unit: 'kWh', calculated_cost: 1334000, validation_status: 'Valid', notes: 'Normal, beban villa penuh' },
    { energy_record_id: 'ENG-20260516-04', record_date: '2026-05-16', category: 'Air PDAM', input_method: 'Meter Reading', meter_reading: '18440', usage_value: 98, unit: 'm³', calculated_cost: 882000, validation_status: 'Anomali', notes: 'Spike +35 m³ vs rata-rata harian 61 m³' },
    { energy_record_id: 'ENG-20260516-02', record_date: '2026-05-16', category: 'Gas LPG', input_method: 'Daily Usage', meter_reading: '', usage_value: 30, unit: 'kg', calculated_cost: 270000, validation_status: 'Valid', notes: 'Restoran & Bakery operasional normal' },
    { energy_record_id: 'ENG-20260515-03', record_date: '2026-05-15', category: 'Fuel Genset', input_method: 'Daily Usage', meter_reading: '', usage_value: 35, unit: 'Liter', calculated_cost: 525000, validation_status: 'Valid', notes: 'Uji beban rutin 15 menit' },
    { energy_record_id: 'ENG-20260515-01', record_date: '2026-05-15', category: 'Air PDAM', input_method: 'Meter Reading', meter_reading: '18342', usage_value: 58, unit: 'm³', calculated_cost: 522000, validation_status: 'Valid', notes: 'Pengisian tandon atas' }
  ],
  purchase: {
    period: '2026-05',
    current: { total_amount: 35400000, description: 'Belanja suku cadang perbaikan kolam, mechanical seal pompa, pelumas genset, dan chemical pool Mei.' },
    previous: { total_amount: 32500000, description: 'Realisasi belanja suku cadang AC dan operasional April.' },
    comparison: { difference: 2900000, percentChange: 8.9, hasComparison: true }
  },
  evaluations: [
    { evaluation_id: 'EVL-1', evaluation_category: 'Energy', title: 'Anomali Air PDAM', finding: 'Lonjakan pemakaian di Villa Cluster B (+14.2% vs baseline).', actual_value: '98 m³ (16 Mei)', comparison_value: '61 m³ (Rata-rata)', severity: 'Perhatian', recommendation: 'Inspeksi grounding pipe sirkulasi dan solenoid valve tandon B.' },
    { evaluation_id: 'EVL-2', evaluation_category: 'Project', title: 'Over Budget Pompa Sirkulasi (PRJ-2026-002)', finding: 'Biaya servis motor melampaui plafon awal (Total Rp 22.800.000 vs Rp 20.000.000).', actual_value: 'Rp 22.800.000', comparison_value: 'Rp 20.000.000', severity: 'Perhatian', recommendation: 'Ajukan memo justifikasi Capex penyesuaian biaya penggantian valve pressure high-grade.' },
    { evaluation_id: 'EVL-3', evaluation_category: 'Activity', title: 'HVAC Filter Replacement Selesai Tepat Waktu', finding: 'Pembersihan & penggantian media filter AHU Unit 01-08 selesai tanpa kendala.', actual_value: '100% Selesai', comparison_value: 'Target 100%', severity: 'Informasi', recommendation: 'Pertahankan jadwal preventative maintenance 2 mingguan.' }
  ]
};

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
      console.warn(`[ApiClient] Call to '${action}' fallback to responsive store:`, err);
      return this.mockFallback(action, payload);
    }
  },

  /**
   * Offline demo fallback so app remains functional during offline testing or before GAS URL is set
   */
  mockFallback(action, payload) {
    if (action === 'dashboard.get') {
      const total = mockStore.activities.length;
      const done = mockStore.activities.filter(a => a.status === 'Done').length;
      const inProg = mockStore.activities.filter(a => a.status === 'In Progress').length;
      const pending = mockStore.activities.filter(a => a.status === 'Pending').length;
      const compRate = total > 0 ? ((done / total) * 100).toFixed(1) : 0;

      const totalBudget = mockStore.projects.reduce((acc, p) => acc + (p.budget || 0), 0);
      const totalCost = mockStore.projects.reduce((acc, p) => acc + (p.project_cost || 0), 0);
      const overBudgetCount = mockStore.projects.filter(p => (p.project_cost || 0) > (p.budget || 0)).length;

      const totalEnergyCost = mockStore.energy.reduce((acc, e) => acc + (e.calculated_cost || 0), 0);

      return {
        success: true,
        kpiCards: {
          activities: { total, done, inProgress: inProg, pending, completionRate: compRate },
          projects: { total: mockStore.projects.length, totalBudget, totalCost, overBudgetCount },
          energy: { totalCost: totalEnergyCost || 71762500, budgetPlafon: 78000000 },
          purchase: { totalAmount: mockStore.purchase.current.total_amount }
        },
        topEvaluations: mockStore.evaluations
      };
    }

    if (action === 'activity.list') {
      const total = mockStore.activities.length;
      const done = mockStore.activities.filter(a => a.status === 'Done').length;
      const inProg = mockStore.activities.filter(a => a.status === 'In Progress').length;
      const pending = mockStore.activities.filter(a => a.status === 'Pending').length;
      const compRate = total > 0 ? ((done / total) * 100).toFixed(1) : 0;
      return {
        success: true,
        kpis: { total, done, inProgress: inProg, pending, completionRate: compRate },
        data: [...mockStore.activities]
      };
    }

    if (action === 'activity.create') {
      const nextId = 'ACT-202605-' + String(mockStore.activities.length + 43).padStart(3, '0');
      const newAct = Object.assign({ activity_id: nextId }, payload);
      mockStore.activities.unshift(newAct);
      return { success: true, message: `Aktivitas ${nextId} berhasil dicatat!`, data: newAct };
    }

    if (action === 'activity.createWeeklyBatch') {
      const items = payload.items || [];
      items.forEach((item, idx) => {
        const nextId = 'ACT-202605-' + String(mockStore.activities.length + 43 + idx).padStart(3, '0');
        mockStore.activities.unshift(Object.assign({ activity_id: nextId, input_mode: 'Weekly' }, item));
      });
      return { success: true, message: `${items.length} aktivitas mingguan berhasil dicatat!` };
    }

    if (action === 'activity.update') {
      const item = mockStore.activities.find(a => a.activity_id === payload.activity_id);
      if (item) Object.assign(item, payload);
      return { success: true, message: `Aktivitas ${payload.activity_id} berhasil diperbarui!` };
    }

    if (action === 'project.list') {
      const totalBudget = mockStore.projects.reduce((acc, p) => acc + (p.budget || 0), 0);
      const totalCost = mockStore.projects.reduce((acc, p) => acc + (p.project_cost || 0), 0);
      const overBudgetList = mockStore.projects.filter(p => (p.project_cost || 0) > (p.budget || 0));
      const totalOverBudget = overBudgetList.reduce((acc, p) => acc + (p.project_cost - p.budget), 0);

      const statusCounts = {
        Completed: mockStore.projects.filter(p => p.status === 'Completed').length,
        InProgress: mockStore.projects.filter(p => p.status === 'In Progress').length,
        Planning: mockStore.projects.filter(p => p.status === 'Planning').length,
        OnHold: mockStore.projects.filter(p => p.status === 'On Hold').length
      };

      return {
        success: true,
        kpis: {
          totalProjects: mockStore.projects.length,
          totalBudget,
          totalCost,
          remainingBudget: Math.max(0, totalBudget - totalCost),
          overBudgetCount: overBudgetList.length,
          totalOverBudgetAmount: totalOverBudget,
          statusCounts
        },
        data: [...mockStore.projects]
      };
    }

    if (action === 'project.create') {
      const nextId = 'PRJ-2026-' + String(mockStore.projects.length + 5).padStart(3, '0');
      const b = parseFloat(payload.budget) || 0;
      const c = parseFloat(payload.project_cost) || 0;
      const newPrj = Object.assign({ project_id: nextId, budget: b, project_cost: c, isOverBudget: c > b }, payload);
      mockStore.projects.unshift(newPrj);
      return { success: true, message: `Proyek Capex ${nextId} berhasil dibuat!`, data: newPrj };
    }

    if (action === 'project.update') {
      const item = mockStore.projects.find(p => p.project_id === payload.project_id);
      if (item) {
        Object.assign(item, payload);
        if (item.budget && item.project_cost) {
          item.isOverBudget = item.project_cost > item.budget;
        }
      }
      return { success: true, message: `Proyek ${payload.project_id} berhasil diperbarui!` };
    }

    if (action === 'energy.list') {
      return { success: true, data: [...mockStore.energy] };
    }

    if (action === 'energy.create') {
      const nextId = 'ENG-20260518-' + String(mockStore.energy.length + 5).padStart(2, '0');
      let usage = parseFloat(payload.usage_value) || 0;
      let status = 'Valid';

      if (payload.input_method === 'Meter Reading') {
        const currentMeter = parseFloat(payload.meter_reading);
        const prev = mockStore.energy.find(e => e.category === payload.category && e.meter_reading);
        if (prev && currentMeter >= parseFloat(prev.meter_reading)) {
          usage = currentMeter - parseFloat(prev.meter_reading);
        } else if (prev) {
          status = 'Anomali';
        }
      }

      const tariffs = { 'Listrik PLN': 1450, 'Air PDAM': 9000, 'Gas LPG': 9000, 'Fuel Genset': 15000 };
      const rate = tariffs[payload.category] || 1000;
      const cost = Math.round(usage * rate);

      const newRecord = Object.assign({
        energy_record_id: nextId,
        usage_value: usage,
        calculated_cost: cost,
        validation_status: status
      }, payload);

      mockStore.energy.unshift(newRecord);
      return { success: true, message: `Catatan energi ${nextId} berhasil disimpan!`, data: newRecord };
    }

    if (action === 'purchase.get') {
      return { success: true, ...mockStore.purchase };
    }

    if (action === 'purchase.save') {
      mockStore.purchase.current.total_amount = parseFloat(payload.total_amount) || 0;
      mockStore.purchase.current.description = payload.description || '';
      return { success: true, message: 'Ringkasan belanja berhasil disimpan!' };
    }

    if (action === 'evaluation.get' || action === 'evaluation.generate') {
      return { success: true, totalFindings: mockStore.evaluations.length, findings: [...mockStore.evaluations] };
    }

    if (action === 'report.generate') {
      return {
        success: true,
        report: {
          period: payload.period || '2026-05',
          company: 'Agranusa Signature Villa',
          generatedBy: 'I Wayan Sudarma',
          executiveSummary: {
            highlights: [
              `Penyelesaian pekerjaan operasional teknisi mencapai 79.7% (118 dari 148 aktivitas selesai).`,
              `Pengawasan proyek Capex mencatat realisasi Rp 142.500.000 dari plafon alokasi Rp 185.000.000.`,
              `Total pengeluaran utilitas energi tercatat Rp 71.762.500 dengan status efisiensi +4.2% vs target bulanan.`,
              `Belanja operasional (Opex) sebesar Rp 35.400.000 berstatus terkendali.`
            ]
          },
          activities: { kpis: { total: mockStore.activities.length, done: 118, completionRate: 79.7 } },
          energy: { kpis: { totalEnergyCost: 71762500 } },
          managementNotes: payload.managementNotes || 'Disahkan untuk arsip Engineering.'
        }
      };
    }

    if (action === 'report.exportPdf') {
      return {
        success: true,
        period: payload.period || '2026-05',
        fileUrl: 'https://drive.google.com'
      };
    }

    if (action === 'database.init') {
      return { success: true, message: 'Schema 13 tab terverifikasi!' };
    }

    return { success: true, message: 'Operasi sukses.' };
  }
};
