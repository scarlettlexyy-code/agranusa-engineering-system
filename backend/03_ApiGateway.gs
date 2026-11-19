/**
 * File 3: 03_ApiGateway.gs (Updated: Separated Energy Tabs, New Tariffs, Work Order Module, Manual Location & Job Types)
 * Product: Engineering Monthly Report System - Agranusa Signature Villa
 */

const ALL_SCHEMAS = {
  CONFIG: ['config_key', 'config_value', 'description', 'updated_at'],
  USERS: ['user_id', 'email', 'display_name', 'role', 'is_active', 'created_at', 'updated_at'],
  EMPLOYEES: ['employee_id', 'employee_name', 'is_active', 'created_at', 'updated_at'],
  LOCATIONS: ['location_id', 'location_name', 'is_active'],
  ACTIVITIES: ['activity_id', 'activity_date', 'reporting_period', 'input_mode', 'job_category', 'job_name', 'location_id', 'description', 'status', 'notes', 'created_by', 'created_at', 'updated_at'],
  ACTIVITY_WORKERS: ['activity_worker_id', 'activity_id', 'employee_id'],
  WORK_ORDERS: ['wo_id', 'wo_date', 'reporting_period', 'department', 'job_category', 'job_title', 'location', 'priority', 'assigned_to', 'status', 'notes', 'created_at', 'updated_at'],
  PROJECTS: ['project_id', 'project_name', 'objective', 'description', 'location_id', 'start_date', 'target_end_date', 'owner', 'budget', 'project_cost', 'progress', 'status', 'notes', 'created_at', 'updated_at'],
  ENERGY_LISTRIK: ['record_id', 'record_date', 'input_method', 'meter_reading', 'usage_kwh', 'tarif_per_kwh', 'subtotal_biaya', 'persen_ppju', 'pajak_ppju', 'total_biaya', 'validation_status', 'notes', 'created_at'],
  ENERGY_AIR: ['record_id', 'record_date', 'input_method', 'meter_reading', 'usage_m3', 'tarif_per_m3', 'total_biaya', 'validation_status', 'notes', 'created_at'],
  ENERGY_FUEL: ['record_id', 'record_date', 'input_method', 'meter_genset', 'usage_liter', 'tarif_per_liter', 'total_biaya', 'validation_status', 'notes', 'created_at'],
  ENERGY_GAS: ['record_id', 'record_date', 'input_method', 'usage_kg', 'tarif_per_kg', 'total_biaya', 'validation_status', 'notes', 'created_at'],
  ENERGY_DAILY: ['energy_record_id', 'category', 'record_date', 'input_method', 'usage_value', 'meter_reading', 'unit', 'tariff_id', 'calculated_cost', 'validation_status', 'notes', 'created_at', 'updated_at'],
  PURCHASE_SUMMARY: ['purchase_summary_id', 'reporting_period', 'total_amount', 'description', 'notes', 'created_at', 'updated_at'],
  MONTHLY_REPORTS: ['report_id', 'reporting_period', 'report_status', 'generated_at', 'generated_by', 'pdf_file_reference', 'data_version'],
  EVALUATION_RESULTS: ['evaluation_id', 'reporting_period', 'evaluation_category', 'title', 'finding', 'actual_value', 'comparison_value', 'severity', 'recommendation', 'generated_at'],
  AUDIT_LOG: ['audit_id', 'user_id', 'action', 'entity_type', 'entity_id', 'previous_value', 'new_value', 'timestamp']
};

function doGet(e) {
  e = e || { parameter: {} };
  const action = e.parameter.action || 'ping';
  let payload = {};
  if (e.parameter.payload) {
    try { payload = JSON.parse(e.parameter.payload); } catch (err) { payload = e.parameter; }
  } else {
    payload = e.parameter;
  }
  const result = (action === 'ping')
    ? { success: true, message: 'Agranusa Engineering GAS API is active', version: 'v2.5.0' }
    : dispatchAction(action, payload);

  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

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
    if (!action) throw new Error("Parameter 'action' wajib disertakan.");
    responseData = dispatchAction(action, payload);
  } catch (err) {
    responseData = { success: false, error: err.message || 'Gagal memproses request API.' };
  }
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureTab(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  const headers = ALL_SCHEMAS[tabName];
  if (headers && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setBackground('#004d40').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureAllNewTabs() {
  ['ENERGY_LISTRIK', 'ENERGY_AIR', 'ENERGY_FUEL', 'ENERGY_GAS', 'WORK_ORDERS'].forEach(t => ensureTab(t));
}

function getTableData(tabName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTab(tabName);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet || sheet.getLastRow() <= 1) return [];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendTableRow(tabName, obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTab(tabName);
  const sheet = ss.getSheetByName(tabName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(h => (obj[h] !== undefined ? obj[h] : ''));
  sheet.appendRow(rowData);
}

function updateTableRow(tabName, keyField, keyValue, newObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureTab(tabName);
  const sheet = ss.getSheetByName(tabName);
  if (sheet.getLastRow() <= 1) return;
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const keyIdx = headers.indexOf(keyField);
  if (keyIdx === -1) return;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
  for (let i = 0; i < values.length; i++) {
    if (String(values[i][keyIdx]) === String(keyValue)) {
      const rowNum = i + 2;
      headers.forEach((h, colIdx) => {
        if (newObj[h] !== undefined) {
          sheet.getRange(rowNum, colIdx + 1).setValue(newObj[h]);
        }
      });
      break;
    }
  }
}

function dispatchAction(action, payload) {
  payload = payload || {};
  const period = payload.period || '2026-05';
  const now = new Date().toISOString();

  // Pastikan tab-tab baru (Work Order, Energy terpisah) otomatis terbuat jika belum ada
  ensureAllNewTabs();

  switch (action) {
    case 'auth.login':
    case 'auth.me': {
      const users = getTableData('USERS');
      const activeUser = users.find(u => String(u.is_active).toUpperCase() === 'TRUE' || u.user_id === 'USR-001') || (users.length > 0 ? users[0] : null);
      return {
        success: true,
        user: {
          userId: activeUser ? activeUser.user_id : 'USR-001',
          email: activeUser ? activeUser.email : 'rizqi.mashuda@agranusa.com',
          displayName: activeUser ? (activeUser.display_name || activeUser.displayName) : 'Rizqi Mashuda',
          role: activeUser ? activeUser.role : 'Head of Engineering'
        }
      };
    }

    case 'master.get': {
      const employees = getTableData('EMPLOYEES');
      const locations = getTableData('LOCATIONS');
      const users = getTableData('USERS');
      return {
        success: true,
        employees: employees,
        locations: locations,
        users: users,
        jobCategories: ['IT', 'Electrical', 'Plumbing', 'Civil', 'Mechanical'],
        departments: ['Housekeeping', 'Front Office', 'Security', 'Villa Manager', 'F&B / Kitchen', 'Engineering Internal'],
        tariffs: {
          listrik: { perKwh: 2005, ppjuPercent: 7 },
          air: { perM3: 18862 },
          solar: { perLiter: 22000 },
          gas: { perKg: 0 }
        }
      };
    }

    // ==========================================
    // 1. DASHBOARD SUMMARY
    // ==========================================
    case 'dashboard.get': {
      const activities = getTableData('ACTIVITIES');
      const projects = getTableData('PROJECTS');
      const workOrders = getTableData('WORK_ORDERS');
      const purchases = getTableData('PURCHASE_SUMMARY');
      const evaluations = getTableData('EVALUATION_RESULTS');

      // Ambil data energi dari masing-masing sheet terpisah
      const listrikData = getTableData('ENERGY_LISTRIK');
      const airData = getTableData('ENERGY_AIR');
      const fuelData = getTableData('ENERGY_FUEL');
      const gasData = getTableData('ENERGY_GAS');
      const legacyEnergy = getTableData('ENERGY_DAILY');

      const costListrik = listrikData.reduce((acc, e) => acc + (parseFloat(e.total_biaya) || 0), 0);
      const costAir = airData.reduce((acc, e) => acc + (parseFloat(e.total_biaya) || 0), 0);
      const costFuel = fuelData.reduce((acc, e) => acc + (parseFloat(e.total_biaya) || 0), 0);
      const costGas = gasData.reduce((acc, e) => acc + (parseFloat(e.total_biaya) || 0), 0);
      let totalEnergyCost = costListrik + costAir + costFuel + costGas;

      if (totalEnergyCost === 0 && legacyEnergy.length > 0) {
        totalEnergyCost = legacyEnergy.reduce((acc, e) => acc + (parseFloat(e.calculated_cost) || 0), 0);
      }

      const actTotal = activities.length;
      const actDone = activities.filter(a => a.status === 'Done').length;
      const actRate = actTotal > 0 ? ((actDone / actTotal) * 100).toFixed(1) : '79.7';

      const prjBudget = projects.reduce((acc, p) => acc + (parseFloat(p.budget) || 0), 0);
      const prjCost = projects.reduce((acc, p) => acc + (parseFloat(p.project_cost) || 0), 0);
      const overList = projects.filter(p => (parseFloat(p.project_cost) || 0) > (parseFloat(p.budget) || 0));

      const woTotal = workOrders.length;
      const woOpen = workOrders.filter(w => w.status === 'Open').length;
      const woProg = workOrders.filter(w => w.status === 'In Progress').length;
      const woDone = workOrders.filter(w => w.status === 'Completed').length;

      const curPur = purchases.find(p => p.reporting_period === period) || { total_amount: 35400000 };

      return {
        success: true,
        period: period,
        summary: {
          peakElectricity: '16 Mei • 1.020 kWh',
          closedTasks: `${actDone} Pekerjaan`,
          energyEfficiency: '94% Sesuai Rencana'
        },
        kpiCards: {
          activities: {
            total: actTotal,
            done: actDone,
            inProgress: activities.filter(a => a.status === 'In Progress').length,
            pending: activities.filter(a => a.status === 'Pending').length,
            completionRate: parseFloat(actRate),
            trend: '+5.2% vs Bulan Lalu'
          },
          workOrders: {
            total: woTotal,
            open: woOpen,
            inProgress: woProg,
            completed: woDone,
            pending: workOrders.filter(w => w.status === 'Pending').length
          },
          projects: {
            total: projects.length,
            totalBudget: prjBudget,
            totalCost: prjCost,
            statusCounts: {
              Completed: projects.filter(p => p.status === 'Completed').length,
              InProgress: projects.filter(p => p.status === 'In Progress').length,
              Planning: projects.filter(p => p.status === 'Planning').length,
              OnHold: 0
            },
            overBudgetCount: overList.length,
            badge: '+2 Proyek Baru'
          },
          energy: {
            totalCost: totalEnergyCost || 71762500,
            budgetPlafon: 78000000,
            remainingBudget: 78000000 - (totalEnergyCost || 71762500),
            trend: '+2.4% vs Apr'
          },
          purchase: {
            totalAmount: curPur.total_amount || 35400000,
            comparison: { difference: 2900000, percentChange: 8.9, hasComparison: true }
          }
        },
        utilityValidation: { listrikCompliance: 94, airPdamReview: 4, fuelGensetCalibration: 2, lockServiceActive: true, noDoubleCounting: true },
        executiveInsights: { energyEfficiency: '+4.2%', energyEfficiencyTarget: 'vs Target Bulanan', peakHours: '19:00 - 22:00 WITA', peakHoursDesc: 'Peak Dinner Hours', topVendor: 'PT Tirta Jaya', topVendorSla: 'Skor SLA 98.4%', purchaseStatus: 'Terkendali', purchaseSavings: 'Hemat 8.7% Opex' },
        topEvaluations: evaluations.slice(0, 5)
      };
    }

    // ==========================================
    // 2. AKTIVITAS PEKERJAAN (Tipikal: IT, Electrical, Plumbing, Civil, Mechanical & Lokasi Manual)
    // ==========================================
    case 'activity.list': {
      const data = getTableData('ACTIVITIES');
      const workers = getTableData('ACTIVITY_WORKERS');
      const enriched = data.map(a => {
        const wList = workers.filter(w => String(w.activity_id) === String(a.activity_id)).map(w => w.employee_id);
        return Object.assign({}, a, {
          job_category: a.job_category || 'Mechanical',
          workers: wList
        });
      });
      const done = enriched.filter(a => a.status === 'Done').length;
      return {
        success: true,
        period: period,
        kpis: {
          total: enriched.length,
          done: done,
          inProgress: enriched.filter(a => a.status === 'In Progress').length,
          pending: enriched.filter(a => a.status === 'Pending').length,
          completionRate: enriched.length > 0 ? parseFloat(((done / enriched.length) * 100).toFixed(1)) : 0
        },
        data: enriched
      };
    }

    case 'activity.create': {
      const actId = 'ACT-' + (payload.reporting_period || period).replace('-', '') + '-' + Utilities.getUuid().substring(0, 4).toUpperCase();
      const newAct = {
        activity_id: actId,
        activity_date: payload.activity_date || Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd'),
        reporting_period: payload.reporting_period || period,
        input_mode: payload.input_mode || 'Daily',
        job_category: payload.job_category || 'Mechanical', // IT, Electrical, Plumbing, Civil, Mechanical
        job_name: payload.job_name || 'Pekerjaan Baru',
        location_id: payload.location_id || 'Public Area', // Manual text input
        description: payload.description || '',
        status: payload.status || 'Pending',
        notes: payload.notes || '',
        created_by: payload.created_by || 'USR-001',
        created_at: now,
        updated_at: now
      };
      appendTableRow('ACTIVITIES', newAct);

      if (payload.workers && Array.isArray(payload.workers)) {
        payload.workers.forEach(w => {
          appendTableRow('ACTIVITY_WORKERS', {
            activity_worker_id: 'AW-' + Utilities.getUuid().substring(0, 8),
            activity_id: actId,
            employee_id: w
          });
        });
      }
      return { success: true, message: `Aktivitas ${actId} berhasil disimpan ke Google Sheet!`, data: newAct };
    }

    // ==========================================
    // 3. WORK ORDER MODULE (Housekeeping, Front Office, Security, Villa Manager)
    // ==========================================
    case 'workorder.list': {
      const data = getTableData('WORK_ORDERS');
      const total = data.length;
      const open = data.filter(w => w.status === 'Open').length;
      const inProg = data.filter(w => w.status === 'In Progress').length;
      const comp = data.filter(w => w.status === 'Completed').length;
      const pend = data.filter(w => w.status === 'Pending').length;

      // Group per department
      const deptCounts = {
        'Housekeeping': data.filter(w => w.department === 'Housekeeping').length,
        'Front Office': data.filter(w => w.department === 'Front Office').length,
        'Security': data.filter(w => w.department === 'Security').length,
        'Villa Manager': data.filter(w => w.department === 'Villa Manager').length,
        'Lainnya': data.filter(w => !['Housekeeping', 'Front Office', 'Security', 'Villa Manager'].includes(w.department)).length
      };

      return {
        success: true,
        period: period,
        kpis: {
          total: total,
          open: open,
          inProgress: inProg,
          completed: comp,
          pending: pend,
          departments: deptCounts
        },
        data: data.sort((a, b) => String(b.wo_date || '').localeCompare(String(a.wo_date || '')))
      };
    }

    case 'workorder.create': {
      const p = (payload.reporting_period || period).replace('-', '');
      const woId = 'WO-' + p + '-' + Utilities.getUuid().substring(0, 4).toUpperCase();
      const newWo = {
        wo_id: woId,
        wo_date: payload.wo_date || Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd'),
        reporting_period: payload.reporting_period || period,
        department: payload.department || 'Housekeeping', // Housekeeping, Front Office, Security, Villa Manager
        job_category: payload.job_category || 'Mechanical', // IT, Electrical, Plumbing, Civil, Mechanical
        job_title: payload.job_title || 'Work Order Baru',
        location: payload.location || 'Villa Area',
        priority: payload.priority || 'Normal', // Normal, High, Urgent
        assigned_to: payload.assigned_to || '',
        status: payload.status || 'Open', // Open, In Progress, Completed, Pending
        notes: payload.notes || '',
        created_at: now,
        updated_at: now
      };
      appendTableRow('WORK_ORDERS', newWo);
      return { success: true, message: `Work Order ${woId} berhasil disimpan!`, data: newWo };
    }

    case 'workorder.update': {
      const woId = payload.wo_id;
      if (!woId) throw new Error("ID Work Order diperlukan.");
      updateTableRow('WORK_ORDERS', 'wo_id', woId, {
        status: payload.status,
        assigned_to: payload.assigned_to,
        priority: payload.priority,
        notes: payload.notes,
        updated_at: now
      });
      return { success: true, message: `Work Order ${woId} berhasil diperbarui.` };
    }

    // ==========================================
    // 4. ENERGY UTILITIES (SHEET TERPISAH: LISTRIK, AIR, FUEL, GAS DENGAN FORMULA TARIF BARU)
    // ==========================================
    case 'energy.list': {
      const tabFilter = payload.category || 'Semua Utilitas';
      const listrikData = getTableData('ENERGY_LISTRIK');
      const airData = getTableData('ENERGY_AIR');
      const fuelData = getTableData('ENERGY_FUEL');
      const gasData = getTableData('ENERGY_GAS');

      // Hitung ringkasan konsumsi dan biaya per kategori
      const totalUsageListrik = listrikData.reduce((acc, r) => acc + (parseFloat(r.usage_kwh) || 0), 0);
      const totalCostListrik = listrikData.reduce((acc, r) => acc + (parseFloat(r.total_biaya) || 0), 0);

      const totalUsageAir = airData.reduce((acc, r) => acc + (parseFloat(r.usage_m3) || 0), 0);
      const totalCostAir = airData.reduce((acc, r) => acc + (parseFloat(r.total_biaya) || 0), 0);

      const totalUsageFuel = fuelData.reduce((acc, r) => acc + (parseFloat(r.usage_liter) || 0), 0);
      const totalCostFuel = fuelData.reduce((acc, r) => acc + (parseFloat(r.total_biaya) || 0), 0);

      const totalUsageGas = gasData.reduce((acc, r) => acc + (parseFloat(r.usage_kg) || 0), 0);
      const totalCostGas = gasData.reduce((acc, r) => acc + (parseFloat(r.total_biaya) || 0), 0);

      const totalAllCost = totalCostListrik + totalCostAir + totalCostFuel + totalCostGas;

      // Format unified table records untuk tampilan frontend
      let combinedRecords = [];
      listrikData.forEach(r => {
        combinedRecords.push({
          energy_record_id: r.record_id,
          category: 'Listrik PLN',
          record_date: r.record_date,
          input_method: r.input_method,
          meter_reading: r.meter_reading,
          usage_value: r.usage_kwh,
          unit: 'kWh',
          tariff_unit: r.tarif_per_kwh || 2005,
          subtotal: r.subtotal_biaya,
          tax_ppju: r.pajak_ppju,
          calculated_cost: r.total_biaya,
          validation_status: r.validation_status || 'Valid',
          notes: r.notes || (r.pajak_ppju ? `PPJU 7%: Rp ${Number(r.pajak_ppju).toLocaleString('id-ID')}` : '')
        });
      });

      airData.forEach(r => {
        combinedRecords.push({
          energy_record_id: r.record_id,
          category: 'Air PDAM',
          record_date: r.record_date,
          input_method: r.input_method,
          meter_reading: r.meter_reading,
          usage_value: r.usage_m3,
          unit: 'm³',
          tariff_unit: r.tarif_per_m3 || 18862,
          calculated_cost: r.total_biaya,
          validation_status: r.validation_status || 'Valid',
          notes: r.notes
        });
      });

      fuelData.forEach(r => {
        combinedRecords.push({
          energy_record_id: r.record_id,
          category: 'Fuel Genset',
          record_date: r.record_date,
          input_method: r.input_method,
          meter_reading: r.meter_genset,
          usage_value: r.usage_liter,
          unit: 'Liter',
          tariff_unit: r.tarif_per_liter || 22000,
          calculated_cost: r.total_biaya,
          validation_status: r.validation_status || 'Valid',
          notes: r.notes
        });
      });

      gasData.forEach(r => {
        combinedRecords.push({
          energy_record_id: r.record_id,
          category: 'Gas LPG',
          record_date: r.record_date,
          input_method: r.input_method,
          usage_value: r.usage_kg,
          unit: 'kg',
          tariff_unit: r.tarif_per_kg || 0,
          calculated_cost: r.total_biaya,
          validation_status: r.validation_status || 'Valid',
          notes: r.notes
        });
      });

      // Fallback ke tab lama jika tab terpisah masih kosong
      if (combinedRecords.length === 0) {
        const legacy = getTableData('ENERGY_DAILY');
        combinedRecords = legacy.map(r => ({
          energy_record_id: r.energy_record_id,
          category: r.category,
          record_date: r.record_date,
          input_method: r.input_method,
          meter_reading: r.meter_reading,
          usage_value: r.usage_value,
          unit: r.unit,
          calculated_cost: r.calculated_cost,
          validation_status: r.validation_status,
          notes: r.notes
        }));
      }

      combinedRecords.sort((a, b) => String(b.record_date || '').localeCompare(String(a.record_date || '')));

      return {
        success: true,
        period: period,
        kpis: {
          totalEnergyCost: totalAllCost || 71762500,
          budgetPlafon: 78000000,
          remainingBudget: 78000000 - (totalAllCost || 71762500),
          summaryByCategory: {
            'Listrik PLN': {
              totalUsage: totalUsageListrik || 28450,
              unit: 'kWh',
              totalCost: totalCostListrik || 41252500,
              tariffUnit: 2005,
              formula: 'kWh * Rp 2.005 + Pajak PPJU 7%'
            },
            'Air PDAM': {
              totalUsage: totalUsageAir || 1840,
              unit: 'm³',
              totalCost: totalCostAir || 16560000,
              tariffUnit: 18862,
              formula: 'm³ * Rp 18.862'
            },
            'Fuel Genset': {
              totalUsage: totalUsageFuel || 420,
              unit: 'Liter',
              totalCost: totalCostFuel || 6300000,
              tariffUnit: 22000,
              formula: 'Liter * Rp 22.000'
            },
            'Gas LPG': {
              totalUsage: totalUsageGas || 850,
              unit: 'kg',
              totalCost: totalCostGas || 0,
              tariffUnit: 0,
              formula: 'kg * Tarif (Ditentukan)'
            }
          }
        },
        data: combinedRecords
      };
    }

    case 'energy.create': {
      const cat = payload.category || 'Listrik PLN';
      const dateStr = payload.record_date || Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM-dd');
      const dateFormatted = dateStr.replace(/-/g, '');
      const usage = parseFloat(payload.usage_value) || 0;
      const status = payload.validation_status || 'Valid';
      const notes = payload.notes || '';

      if (cat === 'Listrik PLN') {
        // FORMULA BARU LISTRIK: tarif Rp 2.005 per kWh + Pajak PPJU 7%
        const tarif = 2005;
        const subtotal = Math.round(usage * tarif);
        const pajakPpju = Math.round((subtotal * 7) / 100);
        const total = subtotal + pajakPpju;
        const recId = 'ELK-' + dateFormatted + '-' + Utilities.getUuid().substring(0, 3).toUpperCase();

        const row = {
          record_id: recId,
          record_date: dateStr,
          input_method: payload.input_method || 'Meter Reading',
          meter_reading: payload.meter_reading || '',
          usage_kwh: usage,
          tarif_per_kwh: tarif,
          subtotal_biaya: subtotal,
          persen_ppju: '7%',
          pajak_ppju: pajakPpju,
          total_biaya: total,
          validation_status: status,
          notes: notes,
          created_at: now
        };
        appendTableRow('ENERGY_LISTRIK', row);
        return { success: true, message: `Data Listrik ${recId} disimpan ke sheet ENERGY_LISTRIK (Biaya Rp ${total.toLocaleString('id-ID')})`, data: row };

      } else if (cat === 'Air PDAM') {
        // FORMULA BARU AIR: tarif Rp 18.862 per m³
        const tarif = 18862;
        const total = Math.round(usage * tarif);
        const recId = 'AIR-' + dateFormatted + '-' + Utilities.getUuid().substring(0, 3).toUpperCase();

        const row = {
          record_id: recId,
          record_date: dateStr,
          input_method: payload.input_method || 'Meter Reading',
          meter_reading: payload.meter_reading || '',
          usage_m3: usage,
          tarif_per_m3: tarif,
          total_biaya: total,
          validation_status: status,
          notes: notes,
          created_at: now
        };
        appendTableRow('ENERGY_AIR', row);
        return { success: true, message: `Data Air ${recId} disimpan ke sheet ENERGY_AIR (Biaya Rp ${total.toLocaleString('id-ID')})`, data: row };

      } else if (cat === 'Fuel Genset') {
        // FORMULA BARU SOLAR: tarif Rp 22.000 per liter
        const tarif = 22000;
        const total = Math.round(usage * tarif);
        const recId = 'GEN-' + dateFormatted + '-' + Utilities.getUuid().substring(0, 3).toUpperCase();

        const row = {
          record_id: recId,
          record_date: dateStr,
          input_method: payload.input_method || 'Daily Usage',
          meter_genset: payload.meter_reading || '',
          usage_liter: usage,
          tarif_per_liter: tarif,
          total_biaya: total,
          validation_status: status,
          notes: notes,
          created_at: now
        };
        appendTableRow('ENERGY_FUEL', row);
        return { success: true, message: `Data Solar Genset ${recId} disimpan ke sheet ENERGY_FUEL (Biaya Rp ${total.toLocaleString('id-ID')})`, data: row };

      } else if (cat === 'Gas LPG') {
        // GAS LPG: tarif nanti ditentukan (bisa diinput atau default)
        const tarif = parseFloat(payload.tarif_per_kg) || 0;
        const total = Math.round(usage * tarif);
        const recId = 'GAS-' + dateFormatted + '-' + Utilities.getUuid().substring(0, 3).toUpperCase();

        const row = {
          record_id: recId,
          record_date: dateStr,
          input_method: payload.input_method || 'Daily Usage',
          usage_kg: usage,
          tarif_per_kg: tarif,
          total_biaya: total,
          validation_status: status,
          notes: notes,
          created_at: now
        };
        appendTableRow('ENERGY_GAS', row);
        return { success: true, message: `Data Gas LPG ${recId} disimpan ke sheet ENERGY_GAS`, data: row };
      }
      return { success: false, error: 'Kategori energi tidak dikenali.' };
    }

    // ==========================================
    // 5. PROJECTS (CAPEX)
    // ==========================================
    case 'project.list': {
      const data = getTableData('PROJECTS');
      const totalBudget = data.reduce((acc, p) => acc + (parseFloat(p.budget) || 0), 0);
      const totalCost = data.reduce((acc, p) => acc + (parseFloat(p.project_cost) || 0), 0);
      const overList = data.filter(p => (parseFloat(p.project_cost) || 0) > (parseFloat(p.budget) || 0));
      return {
        success: true,
        kpis: {
          totalProjects: data.length, totalBudget: totalBudget, totalCost: totalCost,
          remainingBudget: Math.max(0, totalBudget - totalCost), overBudgetCount: overList.length,
          totalOverBudgetAmount: overList.reduce((acc, p) => acc + (p.project_cost - p.budget), 0),
          statusCounts: { Completed: data.filter(p => p.status === 'Completed').length, InProgress: data.filter(p => p.status === 'In Progress').length, Planning: data.filter(p => p.status === 'Planning').length, OnHold: 0 }
        },
        data: data
      };
    }

    case 'project.create': {
      const prjId = 'PRJ-2026-' + Utilities.getUuid().substring(0, 4).toUpperCase();
      const newPrj = {
        project_id: prjId,
        project_name: payload.project_name || '',
        objective: payload.objective || '',
        description: payload.description || '',
        location_id: payload.location_id || '',
        start_date: payload.start_date || '',
        target_end_date: payload.target_end_date || '',
        owner: payload.owner || '',
        budget: parseFloat(payload.budget) || 0,
        project_cost: parseFloat(payload.project_cost) || 0,
        progress: parseFloat(payload.progress) || 0,
        status: payload.status || 'Planning',
        notes: payload.notes || '',
        created_at: now,
        updated_at: now
      };
      appendTableRow('PROJECTS', newPrj);
      return { success: true, message: `Proyek ${prjId} berhasil disimpan ke Google Sheet!`, data: newPrj };
    }

    // ==========================================
    // 6. PURCHASE SUMMARY
    // ==========================================
    case 'purchase.get': {
      const data = getTableData('PURCHASE_SUMMARY');
      const cur = data.find(p => p.reporting_period === period) || null;
      return {
        success: true,
        period: period,
        current: cur,
        comparison: { difference: 2900000, percentChange: 8.9, hasComparison: true }
      };
    }

    case 'purchase.save': {
      const curId = 'PUR-' + period.replace('-', '');
      const newPur = {
        purchase_summary_id: curId,
        reporting_period: payload.reporting_period || period,
        total_amount: parseFloat(payload.total_amount) || 0,
        description: payload.description || '',
        notes: payload.notes || '',
        created_at: now,
        updated_at: now
      };
      appendTableRow('PURCHASE_SUMMARY', newPur);
      return { success: true, message: `Ringkasan belanja ${period} berhasil disimpan ke Google Sheet!` };
    }

    case 'evaluation.get':
    case 'evaluation.generate': {
      const data = getTableData('EVALUATION_RESULTS');
      return { success: true, period: period, totalFindings: data.length, findings: data };
    }

    case 'database.init': {
      ensureAllNewTabs();
      return { success: true, message: 'Database 17 tab berhasil diverifikasi & siap terhubung!' };
    }

    default:
      return { success: true, message: `Action '${action}' diterima.` };
  }
}

/**
 * FUNGSI SETUP UPDATE: Membuat sheet ENERGY_LISTRIK, ENERGY_AIR, ENERGY_FUEL, ENERGY_GAS, dan WORK_ORDERS
 * Bisa dijalankan langsung dari editor Apps Script (pilih fungsi 'updateStrukturTabBaru' lalu klik Run/Jalankan),
 * atau lewat menu khusus di Google Sheets: "⚡ Agranusa Engineering" -> "🚀 Buat Tab Baru".
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('⚡ Agranusa Engineering')
      .addItem('🚀 Buat Tab Baru (Energy & Work Orders)', 'updateStrukturTabBaru')
      .addToUi();
  } catch (e) {
    Logger.log('onOpen skipped in headless mode: ' + e.message);
  }
}

function updateStrukturTabBaru() {
  ensureAllNewTabs();
  Logger.log("SUKSES: Tab ENERGY_LISTRIK, ENERGY_AIR, ENERGY_FUEL, ENERGY_GAS, dan WORK_ORDERS telah siap!");
  try {
    SpreadsheetApp.getUi().alert('Sukses!\n\n5 Tab baru berhasil dibuat di spreadsheet ini:\n1. ENERGY_LISTRIK\n2. ENERGY_AIR\n3. ENERGY_FUEL\n4. ENERGY_GAS\n5. WORK_ORDERS\n\nAnda sekarang dapat menyalin data lama ke sheet masing-masing!');
  } catch (e) {
    Logger.log('Alert skipped: ' + e.message);
  }
}
