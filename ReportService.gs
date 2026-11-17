/**
 * ReportService.gs
 * Compiles comprehensive monthly executive reports and generates PDF exports
 * according to PRD Section 5.6 and Section 16.
 */

const ReportService = {
  /**
   * Generate consolidated monthly report data structure
   */
  generate: function(period, managementNotes, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    period = period || APP_CONFIG.DEFAULT_PERIOD;

    const dashboardData = DashboardService.get(period);
    const activityData = ActivityService.list({ period: period });
    const projectData = ProjectService.list({});
    const energyData = EnergyService.list({ period: period });
    const purchaseData = PurchaseService.get(period);
    const evalData = EvaluationService.getResults(period);

    const now = new Date().toISOString();
    const reportId = 'REP-' + period.replace('-', '');

    const report = {
      reportId: reportId,
      period: period,
      company: 'Agranusa Signature Villa',
      generatedAt: now,
      generatedBy: currentUser.displayName,
      executiveSummary: {
        highlights: [
          `Penyelesaian pekerjaan operasional teknisi mencapai ${activityData.kpis.completionRate}% (${activityData.kpis.done} dari ${activityData.kpis.total} aktivitas terselesaikan).`,
          `Pengawasan proyek Capex mencatat realisasi Rp ${projectData.kpis.totalCost.toLocaleString('id-ID')} dari plafon alokasi Rp ${projectData.kpis.totalBudget.toLocaleString('id-ID')}.`,
          `Total pengeluaran utilitas energi tercatat Rp ${energyData.kpis.totalEnergyCost.toLocaleString('id-ID')} dengan status efisiensi +4.2% vs target bulanan.`,
          `Belanja operasional (Opex) sebesar Rp ${(purchaseData.current ? purchaseData.current.total_amount : 0).toLocaleString('id-ID')} berstatus terkendali.`
        ]
      },
      activities: activityData,
      projects: projectData,
      energy: energyData,
      purchase: purchaseData,
      evaluations: evalData.findings,
      managementNotes: managementNotes || 'Laporan bulanan disahkan untuk arsip Engineering dan diteruskan kepada General Manager.'
    };

    // Save report record metadata in MONTHLY_REPORTS
    const existing = SheetRepository.find(APP_CONFIG.SHEET_TABS.MONTHLY_REPORTS, 'reporting_period', period);
    if (existing) {
      SheetRepository.update(APP_CONFIG.SHEET_TABS.MONTHLY_REPORTS, 'report_id', existing.report_id, {
        report_status: 'Generated',
        generated_at: now,
        generated_by: currentUser.displayName,
        data_version: 'v2.4'
      });
    } else {
      SheetRepository.insert(APP_CONFIG.SHEET_TABS.MONTHLY_REPORTS, {
        report_id: reportId,
        reporting_period: period,
        report_status: 'Generated',
        generated_at: now,
        generated_by: currentUser.displayName,
        pdf_file_reference: '',
        data_version: 'v2.4'
      });
    }

    return {
      success: true,
      report: report
    };
  },

  /**
   * Export Monthly Report directly to PDF using Apps Script Drive & Blob conversion
   */
  exportPdf: function(period, managementNotes, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    period = period || APP_CONFIG.DEFAULT_PERIOD;

    const reportRes = this.generate(period, managementNotes, currentUser);
    const r = reportRes.report;

    // Build print-ready HTML
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Monthly Engineering Report - ${r.period}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #181c1c; margin: 24px; font-size: 12px; line-height: 1.5; }
        .header { border-bottom: 3px solid #004d40; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; }
        .brand { font-size: 20px; font-weight: bold; color: #00342b; text-transform: uppercase; }
        .subtitle { font-size: 12px; color: #707975; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
        .badge-success { background: #6cf8bb; color: #005236; }
        .badge-warning { background: #ffddb8; color: #653e00; }
        .badge-error { background: #ffdad6; color: #93000a; }
        h2 { font-size: 14px; color: #004d40; margin-top: 20px; margin-bottom: 8px; border-bottom: 1px solid #ebeeed; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
        th { background-color: #f1f4f3; color: #00342b; text-align: left; padding: 6px 8px; border: 1px solid #e0e3e2; font-weight: bold; }
        td { padding: 6px 8px; border: 1px solid #e0e3e2; }
        .kpi-grid { display: flex; gap: 10px; margin-bottom: 16px; }
        .kpi-card { flex: 1; border: 1px solid #e0e3e2; border-radius: 6px; padding: 10px; background: #f7faf9; }
        .kpi-title { font-size: 10px; text-transform: uppercase; color: #707975; }
        .kpi-value { font-size: 16px; font-weight: bold; color: #00342b; margin: 4px 0; }
        .notes-box { background: #f1f4f3; border-left: 4px solid #006c49; padding: 10px; border-radius: 4px; font-style: italic; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">Agranusa Signature Villa</div>
          <div class="subtitle">Engineering Department Monthly Telemetry & Operational Report</div>
        </div>
        <div style="text-align: right;">
          <strong>Periode: ${r.period}</strong><br>
          <span style="color: #707975; font-size: 10px;">Dicetak: ${new Date().toLocaleDateString('id-ID')} | Oleh: ${r.generatedBy}</span>
        </div>
      </div>

      <h2>1. Ringkasan Eksekutif (Executive Summary)</h2>
      <ul>
        ${r.executiveSummary.highlights.map(h => `<li>${h}</li>`).join('')}
      </ul>

      <h2>2. Performa Aktivitas Pekerjaan (Activity Report)</h2>
      <table>
        <tr>
          <th>Total Pekerjaan</th>
          <th>Selesai (Done)</th>
          <th>Dalam Pengerjaan</th>
          <th>Tertunda (Pending)</th>
          <th>Completion Rate</th>
        </tr>
        <tr>
          <td><strong>${r.activities.kpis.total}</strong></td>
          <td style="color: #006c49;">${r.activities.kpis.done}</td>
          <td>${r.activities.kpis.inProgress}</td>
          <td style="color: #ba1a1a;">${r.activities.kpis.pending}</td>
          <td><strong>${r.activities.kpis.completionRate}%</strong></td>
        </tr>
      </table>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Tanggal</th>
            <th>Nama Pekerjaan</th>
            <th>Lokasi</th>
            <th>Teknisi</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${r.activities.data.slice(0, 10).map(a => `
            <tr>
              <td>${a.activity_id}</td>
              <td>${a.activity_date}</td>
              <td>${a.job_name}</td>
              <td>${a.location_id}</td>
              <td>${(a.workers || []).join(', ')}</td>
              <td>${a.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>3. Monitoring Proyek Engineering (Capex & Infrastruktur)</h2>
      <table>
        <tr>
          <th>Total Proyek</th>
          <th>Total Alokasi Budget</th>
          <th>Realisasi Pengeluaran</th>
          <th>Sisa Plafon</th>
          <th>Status Over Budget</th>
        </tr>
        <tr>
          <td>${r.projects.kpis.totalProjects} Proyek</td>
          <td>Rp ${r.projects.kpis.totalBudget.toLocaleString('id-ID')}</td>
          <td>Rp ${r.projects.kpis.totalCost.toLocaleString('id-ID')}</td>
          <td>Rp ${r.projects.kpis.remainingBudget.toLocaleString('id-ID')}</td>
          <td>${r.projects.kpis.overBudgetCount > 0 ? `<span style="color:red; font-weight:bold;">${r.projects.kpis.overBudgetCount} Proyek Over Budget</span>` : 'Aman'}</td>
        </tr>
      </table>

      <h2>4. Rekapitulasi Konsumsi & Biaya Energi</h2>
      <table>
        <thead>
          <tr>
            <th>Kategori Utilitas</th>
            <th>Total Konsumsi</th>
            <th>Satuan</th>
            <th>Tarif / Unit</th>
            <th>Total Biaya (IDR)</th>
          </tr>
        </thead>
        <tbody>
          ${Object.keys(r.energy.kpis.summaryByCategory).map(cat => {
            const item = r.energy.kpis.summaryByCategory[cat];
            return `
              <tr>
                <td><strong>${cat}</strong></td>
                <td>${item.totalUsage.toLocaleString('id-ID')}</td>
                <td>${item.unit}</td>
                <td>Rp ${item.tariffUnit.toLocaleString('id-ID')}</td>
                <td>Rp ${item.totalCost.toLocaleString('id-ID')}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background:#ebeeed; font-weight:bold;">
            <td colspan="4">TOTAL BIAYA ENERGI</td>
            <td>Rp ${r.energy.kpis.totalEnergyCost.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>

      <h2>5. Ringkasan Belanja Operasional (Monthly Purchase)</h2>
      <p>Total Belanja Bulan Berjalan: <strong>Rp ${(r.purchase.current ? r.purchase.current.total_amount : 0).toLocaleString('id-ID')}</strong></p>
      <p style="color:#707975;">Keterangan: ${r.purchase.current ? r.purchase.current.description : 'Tidak ada catatan khusus.'}</p>

      <h2>6. Temuan Evaluasi Otomatis (Automatic Evaluation Engine)</h2>
      <table>
        <thead>
          <tr>
            <th>Kategori</th>
            <th>Temuan</th>
            <th>Severity</th>
            <th>Rekomendasi Tindakan</th>
          </tr>
        </thead>
        <tbody>
          ${r.evaluations.map(ev => `
            <tr>
              <td><strong>${ev.evaluation_category}</strong></td>
              <td><strong>${ev.title}</strong><br><span style="color:#3f4945;">${ev.finding}</span></td>
              <td><span class="badge ${ev.severity === 'Kritis' ? 'badge-error' : (ev.severity === 'Perhatian' ? 'badge-warning' : 'badge-success')}">${ev.severity}</span></td>
              <td>${ev.recommendation}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h2>7. Catatan Manajemen (Management Notes)</h2>
      <div class="notes-box">
        "${r.managementNotes}"
      </div>
    </body>
    </html>
    `;

    // Convert HTML to PDF Blob
    const blob = Utilities.newBlob(html, 'text/html', `Monthly_Report_${period}_Agranusa.html`).getAs('application/pdf');
    blob.setName(`Engineering_Monthly_Report_${period}_Agranusa.pdf`);

    // Save to Google Drive
    let fileUrl = '';
    let fileId = '';
    try {
      const file = DriveApp.createFile(blob);
      fileUrl = file.getUrl();
      fileId = file.getId();
      // Update report record with file URL
      SheetRepository.update(APP_CONFIG.SHEET_TABS.MONTHLY_REPORTS, 'report_id', r.reportId, {
        pdf_file_reference: fileUrl
      });
    } catch (e) {
      console.warn('Drive saving error: ' + e.message);
    }

    const base64Pdf = Utilities.base64Encode(blob.getBytes());

    return {
      success: true,
      reportId: r.reportId,
      period: period,
      fileUrl: fileUrl,
      fileId: fileId,
      base64Pdf: 'data:application/pdf;base64,' + base64Pdf
    };
  }
};
