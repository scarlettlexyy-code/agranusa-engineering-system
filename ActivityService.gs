/**
 * ActivityService.gs
 * Manages daily and weekly engineering activity reports per PRD Section 5.2.
 */

const ActivityService = {
  /**
   * List activities with filters and KPI metrics
   */
  list: function(params) {
    params = params || {};
    const period = params.period || APP_CONFIG.DEFAULT_PERIOD;
    const activities = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.ACTIVITIES);
    const workers = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.ACTIVITY_WORKERS);

    // Filter by period
    let filtered = activities.filter(a => {
      const p = a.reporting_period || (a.activity_date ? a.activity_date.substring(0, 7) : '');
      return !period || p === period;
    });

    // Map worker names to each activity
    filtered = filtered.map(a => {
      const actWorkers = workers.filter(w => String(w.activity_id) === String(a.activity_id)).map(w => w.employee_id);
      return Object.assign({}, a, { workers: actWorkers });
    });

    // Apply filters
    if (params.status && params.status !== 'Semua Status') {
      filtered = filtered.filter(a => a.status === params.status);
    }
    if (params.location && params.location !== 'Semua Lokasi') {
      filtered = filtered.filter(a => a.location_id === params.location);
    }
    if (params.worker && params.worker !== 'Semua Teknisi') {
      filtered = filtered.filter(a => a.workers.includes(params.worker));
    }
    if (params.mode && params.mode !== 'Semua Mode') {
      filtered = filtered.filter(a => a.input_mode === params.mode);
    }
    if (params.search) {
      const q = String(params.search).toLowerCase();
      filtered = filtered.filter(a =>
        String(a.activity_id).toLowerCase().includes(q) ||
        String(a.job_name).toLowerCase().includes(q) ||
        String(a.description).toLowerCase().includes(q) ||
        String(a.notes).toLowerCase().includes(q) ||
        String(a.location_id).toLowerCase().includes(q)
      );
    }

    // Sort descending by date and ID
    filtered.sort((a, b) => {
      if (b.activity_date !== a.activity_date) {
        return String(b.activity_date).localeCompare(String(a.activity_date));
      }
      return String(b.activity_id).localeCompare(String(a.activity_id));
    });

    // Calculate metrics
    const total = filtered.length;
    const doneCount = filtered.filter(a => a.status === 'Done').length;
    const inProgressCount = filtered.filter(a => a.status === 'In Progress').length;
    const pendingCount = filtered.filter(a => a.status === 'Pending').length;
    const completionRate = total > 0 ? ((doneCount / total) * 100).toFixed(1) : '0.0';

    return {
      success: true,
      period: period,
      kpis: {
        total: total,
        done: doneCount,
        inProgress: inProgressCount,
        pending: pendingCount,
        completionRate: parseFloat(completionRate)
      },
      data: filtered
    };
  },

  /**
   * Create an activity (Daily or Weekly)
   */
  create: function(data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    ValidationService.validateActivity(data);

    const now = new Date().toISOString();
    const period = data.reporting_period || (data.activity_date ? data.activity_date.substring(0, 7) : APP_CONFIG.DEFAULT_PERIOD);
    const prefix = 'ACT-' + period.replace('-', '') + '-';
    const activityId = SheetRepository.generateId(APP_CONFIG.SHEET_TABS.ACTIVITIES, 'activity_id', prefix);

    const newActivity = {
      activity_id: activityId,
      activity_date: data.activity_date,
      reporting_period: period,
      input_mode: data.input_mode || 'Daily',
      weekly_period_start: data.weekly_period_start || '',
      weekly_period_end: data.weekly_period_end || '',
      job_name: data.job_name,
      location_id: data.location_id,
      description: data.description || '',
      status: data.status || 'Pending',
      notes: data.notes || '',
      created_by: currentUser.userId,
      created_at: now,
      updated_at: now
    };

    SheetRepository.insert(APP_CONFIG.SHEET_TABS.ACTIVITIES, newActivity);

    // Save workers
    const workerRecords = [];
    if (data.workers && Array.isArray(data.workers)) {
      data.workers.forEach((worker, idx) => {
        workerRecords.push({
          activity_worker_id: 'AW-' + Utilities.getUuid().substring(0, 8),
          activity_id: activityId,
          employee_id: worker
        });
      });
      SheetRepository.insertBatch(APP_CONFIG.SHEET_TABS.ACTIVITY_WORKERS, workerRecords);
    }

    AuditService.log(currentUser.userId, 'CREATE', 'ACTIVITY', activityId, null, newActivity);

    return {
      success: true,
      activityId: activityId,
      message: 'Aktivitas pekerjaan berhasil disimpan.',
      data: Object.assign({}, newActivity, { workers: data.workers || [] })
    };
  },

  /**
   * Create multiple activities from a weekly report
   */
  createWeeklyBatch: function(weeklyPayload, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    const items = weeklyPayload.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Laporan mingguan harus berisi minimal 1 item aktivitas pekerjaan.');
    }

    const created = [];
    items.forEach(item => {
      item.input_mode = 'Weekly';
      item.weekly_period_start = weeklyPayload.weekly_period_start;
      item.weekly_period_end = weeklyPayload.weekly_period_end;
      item.reporting_period = weeklyPayload.reporting_period || (item.activity_date ? item.activity_date.substring(0, 7) : APP_CONFIG.DEFAULT_PERIOD);
      const res = this.create(item, currentUser);
      created.push(res.data);
    });

    return {
      success: true,
      message: `${created.length} aktivitas dari laporan mingguan berhasil disimpan.`,
      activities: created
    };
  },

  /**
   * Update an existing activity
   */
  update: function(activityId, data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    const existing = SheetRepository.find(APP_CONFIG.SHEET_TABS.ACTIVITIES, 'activity_id', activityId);
    if (!existing) throw new Error(`Aktivitas ${activityId} tidak ditemukan.`);

    ValidationService.validateActivity(Object.assign({}, existing, data));

    const now = new Date().toISOString();
    const updates = {
      activity_date: data.activity_date !== undefined ? data.activity_date : existing.activity_date,
      reporting_period: data.reporting_period !== undefined ? data.reporting_period : existing.reporting_period,
      input_mode: data.input_mode !== undefined ? data.input_mode : existing.input_mode,
      weekly_period_start: data.weekly_period_start !== undefined ? data.weekly_period_start : existing.weekly_period_start,
      weekly_period_end: data.weekly_period_end !== undefined ? data.weekly_period_end : existing.weekly_period_end,
      job_name: data.job_name !== undefined ? data.job_name : existing.job_name,
      location_id: data.location_id !== undefined ? data.location_id : existing.location_id,
      description: data.description !== undefined ? data.description : existing.description,
      status: data.status !== undefined ? data.status : existing.status,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updated_at: now
    };

    SheetRepository.update(APP_CONFIG.SHEET_TABS.ACTIVITIES, 'activity_id', activityId, updates);

    // Update workers if provided
    if (data.workers && Array.isArray(data.workers)) {
      SheetRepository.deleteWhere(APP_CONFIG.SHEET_TABS.ACTIVITY_WORKERS, 'activity_id', activityId);
      const workerRecords = data.workers.map(w => ({
        activity_worker_id: 'AW-' + Utilities.getUuid().substring(0, 8),
        activity_id: activityId,
        employee_id: w
      }));
      SheetRepository.insertBatch(APP_CONFIG.SHEET_TABS.ACTIVITY_WORKERS, workerRecords);
    }

    AuditService.log(currentUser.userId, 'UPDATE', 'ACTIVITY', activityId, existing, updates);

    return {
      success: true,
      message: `Aktivitas ${activityId} berhasil diperbarui.`,
      data: updates
    };
  },

  /**
   * Get single activity detail
   */
  detail: function(activityId) {
    const activity = SheetRepository.find(APP_CONFIG.SHEET_TABS.ACTIVITIES, 'activity_id', activityId);
    if (!activity) throw new Error(`Aktivitas ${activityId} tidak ditemukan.`);

    const workers = SheetRepository.filter(APP_CONFIG.SHEET_TABS.ACTIVITY_WORKERS, 'activity_id', activityId).map(w => w.employee_id);
    const audits = SheetRepository.filter(APP_CONFIG.SHEET_TABS.AUDIT_LOG, 'entity_id', activityId);

    return {
      success: true,
      activity: Object.assign({}, activity, { workers: workers, auditHistory: audits })
    };
  }
};
