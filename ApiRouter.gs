/**
 * ApiRouter.gs
 * Dispatches API requests from Web App or REST calls to appropriate service methods.
 * Provides unified error handling and normalized responses per PRD Section 10.3.
 */

const ApiRouter = {
  /**
   * Main dispatch function
   * @param {string} action
   * @param {object} payload
   */
  dispatch: function(action, payload) {
    payload = payload || {};
    const currentUser = AuthService.getCurrentUser();

    try {
      switch (action) {
        // --- Authentication ---
        case 'auth.login':
          return AuthService.login(payload);
        case 'auth.me':
          return { success: true, user: currentUser };

        // --- Dashboard ---
        case 'dashboard.get':
          return DashboardService.get(payload.period);

        // --- Activities ---
        case 'activity.list':
          return ActivityService.list(payload);
        case 'activity.create':
          return ActivityService.create(payload, currentUser);
        case 'activity.createWeeklyBatch':
          return ActivityService.createWeeklyBatch(payload, currentUser);
        case 'activity.update':
          return ActivityService.update(payload.activity_id, payload, currentUser);
        case 'activity.detail':
          return ActivityService.detail(payload.activity_id);

        // --- Projects ---
        case 'project.list':
          return ProjectService.list(payload);
        case 'project.create':
          return ProjectService.create(payload, currentUser);
        case 'project.update':
          return ProjectService.update(payload.project_id, payload, currentUser);

        // --- Energy ---
        case 'energy.list':
          return EnergyService.list(payload);
        case 'energy.create':
          return EnergyService.create(payload, currentUser);
        case 'energy.update':
          return EnergyService.update(payload.energy_record_id, payload, currentUser);

        // --- Purchase ---
        case 'purchase.get':
          return PurchaseService.get(payload.period);
        case 'purchase.save':
          return PurchaseService.save(payload, currentUser);

        // --- Evaluation ---
        case 'evaluation.generate':
          return EvaluationService.generate(payload.period);
        case 'evaluation.get':
          return EvaluationService.getResults(payload.period);

        // --- Reporting ---
        case 'report.generate':
          return ReportService.generate(payload.period, payload.managementNotes, currentUser);
        case 'report.exportPdf':
          return ReportService.exportPdf(payload.period, payload.managementNotes, currentUser);

        // --- Settings & Master Data ---
        case 'settings.get':
          return { success: true, config: ConfigService.getConfig() };
        case 'settings.update':
          return ConfigService.setConfigValue(payload.key, payload.value, payload.description);
        case 'master.get':
          return {
            success: true,
            locations: SheetRepository.getAll(APP_CONFIG.SHEET_TABS.LOCATIONS).filter(l => l.is_active),
            employees: SheetRepository.getAll(APP_CONFIG.SHEET_TABS.EMPLOYEES).filter(e => e.is_active),
            tariffs: SheetRepository.getAll(APP_CONFIG.SHEET_TABS.ENERGY_TARIFFS).filter(t => t.is_active)
          };
        case 'database.init':
          return SheetRepository.initDatabase();

        default:
          throw new Error(`Aksi API '${action}' tidak dikenali.`);
      }
    } catch (error) {
      console.error(`Error executing action '${action}': ` + error.stack);
      return {
        success: false,
        error: error.message || 'Terjadi kesalahan sistem internal.'
      };
    }
  }
};
