/**
 * EvaluationService.gs
 * Automated Deterministic Evaluation Engine based on PRD Section 6.
 * Generates rule-based findings, anomaly flags, and actionable recommendations.
 */

const EvaluationService = {
  /**
   * Run full automatic evaluation engine for a given reporting period
   */
  generate: function(period) {
    period = period || APP_CONFIG.DEFAULT_PERIOD;
    const now = new Date().toISOString();
    const findings = [];

    // 1. Evaluate Activities
    const actResult = ActivityService.list({ period: period });
    const actKpis = actResult.kpis;
    if (actKpis.total > 0) {
      if (actKpis.completionRate < APP_CONFIG.THRESHOLDS.ACTIVITY_TARGET_COMPLETION) {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-ACT1',
          reporting_period: period,
          evaluation_category: 'Activity',
          title: 'Tingkat Penyelesaian Aktivitas di Bawah Target',
          finding: `Penyelesaian aktivitas pekerjaan baru mencapai ${actKpis.completionRate}% (Target >${APP_CONFIG.THRESHOLDS.ACTIVITY_TARGET_COMPLETION}%). Terdapat ${actKpis.pending} tugas pending dan ${actKpis.inProgress} dalam pengerjaan.`,
          actual_value: `${actKpis.completionRate}%`,
          comparison_value: `Target >${APP_CONFIG.THRESHOLDS.ACTIVITY_TARGET_COMPLETION}%`,
          severity: 'Perhatian',
          recommendation: 'Prioritaskan penyelesaian pekerjaan pending yang tertunda sparepart atau kendala operasional.'
        });
      } else {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-ACT2',
          reporting_period: period,
          evaluation_category: 'Activity',
          title: 'Target Penyelesaian Pekerjaan Tercapai',
          finding: `Tingkat penyelesaian pekerjaan mencapai ${actKpis.completionRate}% (${actKpis.done} dari ${actKpis.total} aktivitas selesai).`,
          actual_value: `${actKpis.completionRate}%`,
          comparison_value: `Target >${APP_CONFIG.THRESHOLDS.ACTIVITY_TARGET_COMPLETION}%`,
          severity: 'Informasi',
          recommendation: 'Pertahankan alur penjadwalan preventif shift teknisi.'
        });
      }

      // Check specific pending tasks without recent updates
      const pendingTasks = actResult.data.filter(a => a.status === 'Pending');
      if (pendingTasks.length > 5) {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-ACT3',
          reporting_period: period,
          evaluation_category: 'Activity',
          title: 'Akumulasi Tugas Tertunda (Pending)',
          finding: `Terdapat ${pendingTasks.length} pekerjaan berstatus Pending yang memerlukan pengadaan suku cadang khusus.`,
          actual_value: `${pendingTasks.length} Pekerjaan`,
          comparison_value: 'Maks 3 Pekerjaan',
          severity: 'Perhatian',
          recommendation: 'Lakukan percepatan pemesanan suku cadang dengan vendor lokal Bali.'
        });
      }
    }

    // 2. Evaluate Projects (Capex)
    const prjResult = ProjectService.list({});
    const overBudgetList = prjResult.data.filter(p => p.isOverBudget);
    const delayedList = prjResult.data.filter(p => p.isDelayed);

    if (overBudgetList.length > 0) {
      overBudgetList.forEach((p, idx) => {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-PRJ' + (idx + 1),
          reporting_period: period,
          evaluation_category: 'Project',
          title: `Over Budget Capex: ${p.project_name} (${p.project_id})`,
          finding: `Realisasi biaya Rp ${p.project_cost.toLocaleString('id-ID')} melampaui plafon alokasi Rp ${p.budget.toLocaleString('id-ID')} (Defisit Rp ${p.overBudgetAmount.toLocaleString('id-ID')}).`,
          actual_value: `Rp ${p.project_cost.toLocaleString('id-ID')}`,
          comparison_value: `Rp ${p.budget.toLocaleString('id-ID')}`,
          severity: 'Perhatian',
          recommendation: 'Ajukan memo justifikasi Capex atau realokasi dana kontinjensi komite GM.'
        });
      });
    }

    if (delayedList.length > 0) {
      delayedList.forEach((p, idx) => {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-PRJD' + (idx + 1),
          reporting_period: period,
          evaluation_category: 'Project',
          title: `Keterlambatan Target Milestone: ${p.project_name}`,
          finding: `Target selesai ${p.target_end_date} telah terlampaui dengan progress saat ini ${p.progress}%.`,
          actual_value: `${p.progress}% Progress`,
          comparison_value: `Target 100% (${p.target_end_date})`,
          severity: 'Perhatian',
          recommendation: 'Evaluasi vendor pelaksana dan tambah man-hour pengerjaan.'
        });
      });
    }

    // 3. Evaluate Energy
    const energyResult = EnergyService.list({ period: period });
    if (energyResult.kpis.anomalies && energyResult.kpis.anomalies.length > 0) {
      energyResult.kpis.anomalies.forEach((anom, idx) => {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-ENG' + (idx + 1),
          reporting_period: period,
          evaluation_category: 'Energy',
          title: `Anomali Utilitas: ${anom.category}`,
          finding: `Terdeteksi pencatatan tidak wajar pada ${anom.record_date}: ${anom.notes}`,
          actual_value: `${anom.usage_value} ${anom.unit}`,
          comparison_value: 'Rata-rata harian normal',
          severity: 'Perhatian',
          recommendation: `Segera lakukan pengecekan fisik instalasi meter ${anom.category} dan jalur pipa/kabel distribusi.`
        });
      });
    }

    // Check energy overall cost vs budget plafon
    if (energyResult.kpis.totalEnergyCost > energyResult.kpis.budgetPlafon) {
      const overCost = energyResult.kpis.totalEnergyCost - energyResult.kpis.budgetPlafon;
      findings.push({
        evaluation_id: 'EVL-' + period.replace('-', '') + '-ENG-BUD',
        reporting_period: period,
        evaluation_category: 'Energy',
        title: 'Total Biaya Energi Melebihi Plafon',
        finding: `Total estimasi biaya energi Rp ${energyResult.kpis.totalEnergyCost.toLocaleString('id-ID')} melampaui plafon anggaran Rp ${energyResult.kpis.budgetPlafon.toLocaleString('id-ID')}.`,
        actual_value: `Rp ${energyResult.kpis.totalEnergyCost.toLocaleString('id-ID')}`,
        comparison_value: `Rp ${energyResult.kpis.budgetPlafon.toLocaleString('id-ID')}`,
        severity: 'Kritis',
        recommendation: 'Terapkan protokol efisiensi daya chiller saat low occupancy dan inspeksi kebocoran air.'
      });
    }

    // 4. Evaluate Purchase (Opex)
    const purchaseResult = PurchaseService.get(period);
    if (purchaseResult.current && purchaseResult.comparison.hasComparison) {
      if (purchaseResult.comparison.percentChange > 15.0) {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-PUR1',
          reporting_period: period,
          evaluation_category: 'Purchase',
          title: 'Kenaikan Belanja Operasional Bulanan',
          finding: `Total belanja naik +${purchaseResult.comparison.percentChange}% dibandingkan bulan sebelumnya (Kenaikan Rp ${purchaseResult.comparison.difference.toLocaleString('id-ID')}).`,
          actual_value: `Rp ${purchaseResult.current.total_amount.toLocaleString('id-ID')}`,
          comparison_value: `Rp ${purchaseResult.previous.total_amount.toLocaleString('id-ID')}`,
          severity: 'Perhatian',
          recommendation: 'Tinjau kembali perincian pembelian suku cadang tidak terduga.'
        });
      } else {
        findings.push({
          evaluation_id: 'EVL-' + period.replace('-', '') + '-PUR2',
          reporting_period: period,
          evaluation_category: 'Purchase',
          title: 'Belanja Operasional Stabil',
          finding: `Total belanja berada dalam rentang variasi yang wajar (+${purchaseResult.comparison.percentChange || 0}%).`,
          actual_value: `Rp ${purchaseResult.current.total_amount.toLocaleString('id-ID')}`,
          comparison_value: purchaseResult.previous ? `Rp ${purchaseResult.previous.total_amount.toLocaleString('id-ID')}` : 'N/A',
          severity: 'Informasi',
          recommendation: 'Pertahankan efisiensi pengadaan suku cadang rutin.'
        });
      }
    }

    // Save/Update findings to EVALUATION_RESULTS tab
    if (findings.length > 0) {
      // Clear previous evaluations for this period to avoid duplicate findings
      SheetRepository.deleteWhere(APP_CONFIG.SHEET_TABS.EVALUATION_RESULTS, 'reporting_period', period);
      
      const recordsToInsert = findings.map(f => Object.assign({}, f, { generated_at: now }));
      SheetRepository.insertBatch(APP_CONFIG.SHEET_TABS.EVALUATION_RESULTS, recordsToInsert);
    }

    return {
      success: true,
      period: period,
      totalFindings: findings.length,
      findings: findings
    };
  },

  /**
   * Get existing evaluation results for a period
   */
  getResults: function(period) {
    period = period || APP_CONFIG.DEFAULT_PERIOD;
    const all = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.EVALUATION_RESULTS);
    const filtered = all.filter(r => r.reporting_period === period);
    if (filtered.length === 0) {
      // If not yet generated, generate now
      return this.generate(period);
    }
    return {
      success: true,
      period: period,
      totalFindings: filtered.length,
      findings: filtered
    };
  }
};
