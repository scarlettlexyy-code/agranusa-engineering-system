/**
 * PurchaseService.gs
 * Manages monthly operational engineering purchase summaries per PRD Section 5.5.
 */

const PurchaseService = {
  /**
   * Get purchase summary for a period and compare with previous month
   */
  get: function(period) {
    period = period || APP_CONFIG.DEFAULT_PERIOD;
    const allSummaries = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.PURCHASE_SUMMARY);

    const current = allSummaries.find(p => p.reporting_period === period) || null;

    // Calculate previous period (e.g., 2026-05 -> 2026-04)
    const parts = period.split('-');
    let year = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const prevPeriod = `${year}-${String(month).padStart(2, '0')}`;
    const previous = allSummaries.find(p => p.reporting_period === prevPeriod) || null;

    let difference = null;
    let percentChange = null;

    if (current && previous) {
      const curAmount = parseFloat(current.total_amount) || 0;
      const prevAmount = parseFloat(previous.total_amount) || 0;
      difference = curAmount - prevAmount;
      if (prevAmount > 0) {
        percentChange = parseFloat(((difference / prevAmount) * 100).toFixed(1));
      }
    }

    return {
      success: true,
      period: period,
      current: current,
      previousPeriod: prevPeriod,
      previous: previous,
      comparison: {
        difference: difference,
        percentChange: percentChange,
        hasComparison: previous !== null
      },
      history: allSummaries.sort((a, b) => String(b.reporting_period).localeCompare(String(a.reporting_period)))
    };
  },

  /**
   * Save or update monthly purchase summary
   */
  save: function(data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    ValidationService.validatePurchase(data);

    const now = new Date().toISOString();
    const period = data.reporting_period;
    const existing = SheetRepository.find(APP_CONFIG.SHEET_TABS.PURCHASE_SUMMARY, 'reporting_period', period);

    let summaryId;
    if (existing) {
      summaryId = existing.purchase_summary_id;
      const updates = {
        total_amount: parseFloat(data.total_amount) || 0,
        description: data.description || existing.description || '',
        notes: data.notes || existing.notes || '',
        updated_at: now
      };
      SheetRepository.update(APP_CONFIG.SHEET_TABS.PURCHASE_SUMMARY, 'purchase_summary_id', summaryId, updates);
      AuditService.log(currentUser.userId, 'UPDATE', 'PURCHASE', summaryId, existing, updates);

      return {
        success: true,
        summaryId: summaryId,
        message: `Ringkasan belanja periode ${period} berhasil diperbarui.`,
        data: Object.assign({}, existing, updates)
      };
    } else {
      summaryId = 'PUR-' + period.replace('-', '');
      const newSummary = {
        purchase_summary_id: summaryId,
        reporting_period: period,
        total_amount: parseFloat(data.total_amount) || 0,
        description: data.description || '',
        notes: data.notes || '',
        created_at: now,
        updated_at: now
      };
      SheetRepository.insert(APP_CONFIG.SHEET_TABS.PURCHASE_SUMMARY, newSummary);
      AuditService.log(currentUser.userId, 'CREATE', 'PURCHASE', summaryId, null, newSummary);

      return {
        success: true,
        summaryId: summaryId,
        message: `Ringkasan belanja periode ${period} berhasil disimpan.`,
        data: newSummary
      };
    }
  }
};
