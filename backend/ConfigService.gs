/**
 * ConfigService.gs
 * Manages configuration, environment properties, and default constants.
 * Product: Engineering Monthly Report System - Agranusa Signature Villa
 *
 * NOTE: APP_CONFIG dan SCHEMAS didefinisikan di _Globals.gs (load lebih awal).
 */

const ConfigService = {
  /**
   * Get Spreadsheet ID from script properties or active sheet
   */
  getSpreadsheetId: function() {
    const props = PropertiesService.getScriptProperties();
    let sheetId = props.getProperty('SPREADSHEET_ID');
    if (!sheetId) {
      try {
        const active = SpreadsheetApp.getActiveSpreadsheet();
        if (active) {
          sheetId = active.getId();
          props.setProperty('SPREADSHEET_ID', sheetId);
        }
      } catch (e) {
        // Not container-bound
      }
    }
    return sheetId;
  },

  /**
   * Set Spreadsheet ID
   */
  setSpreadsheetId: function(sheetId) {
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', sheetId);
    return { success: true, spreadsheetId: sheetId };
  },

  /**
   * Get configuration values
   */
  getConfig: function() {
    const configValues = {};
    try {
      const rows = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.CONFIG);
      rows.forEach(r => {
        configValues[r.config_key] = r.config_value;
      });
    } catch (e) {
      console.warn('Config table not yet available, using defaults');
    }

    return {
      appName: configValues.appName || APP_CONFIG.APP_NAME,
      appVersion: configValues.appVersion || APP_CONFIG.APP_VERSION,
      timezone: configValues.timezone || APP_CONFIG.TIMEZONE,
      thresholds: APP_CONFIG.THRESHOLDS,
      tariffs: APP_CONFIG.DEFAULT_TARIFFS,
      spreadsheetId: this.getSpreadsheetId()
    };
  },

  /**
   * Update or set a specific config key
   */
  setConfigValue: function(key, value, description) {
    const existing = SheetRepository.find(APP_CONFIG.SHEET_TABS.CONFIG, 'config_key', key);
    const now = new Date().toISOString();
    if (existing) {
      SheetRepository.update(APP_CONFIG.SHEET_TABS.CONFIG, 'config_key', key, {
        config_value: value,
        description: description || existing.description,
        updated_at: now
      });
    } else {
      SheetRepository.insert(APP_CONFIG.SHEET_TABS.CONFIG, {
        config_key: key,
        config_value: value,
        description: description || '',
        updated_at: now
      });
    }
    return { success: true };
  }
};
