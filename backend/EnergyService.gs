/**
 * EnergyService.gs
 * Manages energy consumption, meter reading calculations, tariffs,
 * anomaly detection, and anti-double-counting per PRD Section 5.4.
 */

const EnergyService = {
  /**
   * Get applicable tariff for category and date
   */
  getTariff: function(category, dateStr) {
    const tariffs = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.ENERGY_TARIFFS);
    const date = dateStr ? new Date(dateStr) : new Date();

    const match = tariffs.find(t => {
      if (t.category !== category || !t.is_active) return false;
      const from = t.effective_from ? new Date(t.effective_from) : new Date('2000-01-01');
      const to = t.effective_to ? new Date(t.effective_to) : new Date('2099-12-31');
      return date >= from && date <= to;
    });

    if (match) {
      return {
        tariffId: match.tariff_id,
        unit: match.unit,
        value: parseFloat(match.tariff_value) || 0
      };
    }

    // Default fallback
    const def = APP_CONFIG.DEFAULT_TARIFFS[category] || { unit: 'unit', tariff: 0 };
    return {
      tariffId: 'TRF-DEF',
      unit: def.unit,
      value: def.tariff
    };
  },

  /**
   * Get previous valid meter reading for a category before a given date
   */
  getPreviousMeterReading: function(category, beforeDateStr) {
    const records = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.ENERGY_DAILY);
    const meterRecords = records.filter(r =>
      r.category === category &&
      r.input_method === 'Meter Reading' &&
      r.meter_reading !== '' &&
      r.meter_reading !== null &&
      (!beforeDateStr || r.record_date < beforeDateStr)
    );

    if (meterRecords.length === 0) return null;

    // Sort descending by date
    meterRecords.sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));
    return meterRecords[0];
  },

  /**
   * List energy records with summary calculations and conflict checking
   */
  list: function(params) {
    params = params || {};
    const period = params.period || APP_CONFIG.DEFAULT_PERIOD;
    const records = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.ENERGY_DAILY);

    // Filter by period
    let periodRecords = records.filter(r => {
      const p = r.record_date ? r.record_date.substring(0, 7) : '';
      return !period || p === period;
    });

    // Detect conflicts (both daily usage and meter reading for same category and date)
    const dateCategoryMap = {};
    periodRecords.forEach(r => {
      const key = `${r.category}_${r.record_date}`;
      if (!dateCategoryMap[key]) dateCategoryMap[key] = [];
      dateCategoryMap[key].push(r);
    });

    periodRecords = periodRecords.map(r => {
      const key = `${r.category}_${r.record_date}`;
      const conflictGroup = dateCategoryMap[key];
      let hasConflict = false;
      if (conflictGroup && conflictGroup.length > 1) {
        const methods = conflictGroup.map(c => c.input_method);
        if (methods.includes('Daily Usage') && methods.includes('Meter Reading')) {
          hasConflict = true;
        }
      }
      return Object.assign({}, r, { hasConflict: hasConflict });
    });

    // Category KPI Calculation
    const categories = ['Listrik PLN', 'Air PDAM', 'Gas LPG', 'Fuel Genset'];
    const summary = {};
    let totalEnergyCost = 0;

    categories.forEach(cat => {
      const catRecords = periodRecords.filter(r => r.category === cat && !r.hasConflict);
      const totalUsage = catRecords.reduce((acc, r) => acc + (parseFloat(r.usage_value) || 0), 0);
      const totalCost = catRecords.reduce((acc, r) => acc + (parseFloat(r.calculated_cost) || 0), 0);
      const tariff = this.getTariff(cat, period + '-01');

      totalEnergyCost += totalCost;

      summary[cat] = {
        totalUsage: Math.round(totalUsage * 100) / 100,
        unit: tariff.unit,
        totalCost: Math.round(totalCost),
        tariffUnit: tariff.value,
        recordCount: catRecords.length
      };
    });

    // Apply filters to table display
    let filtered = periodRecords;
    if (params.category && params.category !== 'Semua Utilitas') {
      filtered = filtered.filter(r => r.category === params.category);
    }
    if (params.search) {
      const q = String(params.search).toLowerCase();
      filtered = filtered.filter(r =>
        String(r.energy_record_id).toLowerCase().includes(q) ||
        String(r.category).toLowerCase().includes(q) ||
        String(r.record_date).toLowerCase().includes(q) ||
        String(r.notes).toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)));

    // Budget Comparison
    const budgetPlafon = 78000000; // Rp 78 Jt per reference
    const remainingBudget = budgetPlafon - totalEnergyCost;

    // Daily Trend Data for charts
    const dailyTrend = {};
    periodRecords.forEach(r => {
      if (!dailyTrend[r.record_date]) {
        dailyTrend[r.record_date] = { date: r.record_date, electricity: 0, water: 0 };
      }
      if (r.category === 'Listrik PLN') dailyTrend[r.record_date].electricity += (parseFloat(r.usage_value) || 0);
      if (r.category === 'Air PDAM') dailyTrend[r.record_date].water += (parseFloat(r.usage_value) || 0);
    });

    const trendArray = Object.values(dailyTrend).sort((a, b) => a.date.localeCompare(b.date));

    // Active Anomaly alert if any
    const anomalyRecords = periodRecords.filter(r => r.validation_status === 'Anomali');

    return {
      success: true,
      period: period,
      kpis: {
        summaryByCategory: summary,
        totalEnergyCost: totalEnergyCost,
        budgetPlafon: budgetPlafon,
        remainingBudget: remainingBudget,
        anomalyCount: anomalyRecords.length,
        anomalies: anomalyRecords
      },
      dailyTrend: trendArray,
      data: filtered
    };
  },

  /**
   * Create an energy consumption record (Daily Usage or Meter Reading)
   */
  create: function(data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    const prevReading = (data.input_method === 'Meter Reading')
      ? this.getPreviousMeterReading(data.category, data.record_date)
      : null;

    ValidationService.validateEnergy(data, prevReading ? prevReading.meter_reading : null);

    const dateStr = data.record_date;
    const dateFormatted = dateStr.replace(/-/g, '');
    const prefix = 'ENG-' + dateFormatted + '-';
    const recordId = SheetRepository.generateId(APP_CONFIG.SHEET_TABS.ENERGY_DAILY, 'energy_record_id', prefix);

    let usage = parseFloat(data.usage_value) || 0;
    let status = data.validation_status || 'Valid';

    // If Meter Reading, calculate usage = Current Meter - Previous Valid Meter
    if (data.input_method === 'Meter Reading') {
      const currentMeter = parseFloat(data.meter_reading);
      if (prevReading) {
        const prevMeter = parseFloat(prevReading.meter_reading);
        if (currentMeter >= prevMeter) {
          usage = currentMeter - prevMeter;
        } else {
          status = 'Anomali';
          usage = 0;
        }
      } else {
        // First reading baseline
        usage = 0;
        data.notes = (data.notes ? data.notes + '; ' : '') + 'Pembacaan meter awal / baseline.';
      }
    }

    const tariffInfo = this.getTariff(data.category, dateStr);
    const calculatedCost = Math.round(usage * tariffInfo.value);

    const now = new Date().toISOString();
    const newRecord = {
      energy_record_id: recordId,
      category: data.category,
      record_date: dateStr,
      input_method: data.input_method,
      usage_value: usage,
      meter_reading: data.input_method === 'Meter Reading' ? data.meter_reading : '',
      unit: tariffInfo.unit,
      tariff_id: tariffInfo.tariffId,
      calculated_cost: calculatedCost,
      validation_status: status,
      notes: data.notes || '',
      created_at: now,
      updated_at: now
    };

    SheetRepository.insert(APP_CONFIG.SHEET_TABS.ENERGY_DAILY, newRecord);
    AuditService.log(currentUser.userId, 'CREATE', 'ENERGY', recordId, null, newRecord);

    return {
      success: true,
      recordId: recordId,
      message: 'Pencatatan konsumsi energi berhasil disimpan.',
      data: newRecord
    };
  },

  /**
   * Update an existing energy record
   */
  update: function(recordId, data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    const existing = SheetRepository.find(APP_CONFIG.SHEET_TABS.ENERGY_DAILY, 'energy_record_id', recordId);
    if (!existing) throw new Error(`Catatan energi ${recordId} tidak ditemukan.`);

    const now = new Date().toISOString();
    let usage = data.usage_value !== undefined ? (parseFloat(data.usage_value) || 0) : existing.usage_value;
    const cat = data.category || existing.category;
    const dateStr = data.record_date || existing.record_date;

    const tariffInfo = this.getTariff(cat, dateStr);
    const calculatedCost = Math.round(usage * tariffInfo.value);

    const updates = {
      category: cat,
      record_date: dateStr,
      input_method: data.input_method || existing.input_method,
      usage_value: usage,
      meter_reading: data.meter_reading !== undefined ? data.meter_reading : existing.meter_reading,
      calculated_cost: calculatedCost,
      validation_status: data.validation_status || existing.validation_status,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updated_at: now
    };

    SheetRepository.update(APP_CONFIG.SHEET_TABS.ENERGY_DAILY, 'energy_record_id', recordId, updates);
    AuditService.log(currentUser.userId, 'UPDATE', 'ENERGY', recordId, existing, updates);

    return {
      success: true,
      message: `Catatan energi ${recordId} berhasil diperbarui.`,
      data: updates
    };
  }
};
