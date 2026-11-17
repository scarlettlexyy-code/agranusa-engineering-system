/**
 * AuditService.gs
 * Records audit logs for critical database actions and modifications.
 */

const AuditService = {
  /**
   * Log an action
   * @param {string} userId
   * @param {string} action - 'CREATE', 'UPDATE', 'DELETE'
   * @param {string} entityType - 'ACTIVITY', 'PROJECT', 'ENERGY', 'PURCHASE', 'REPORT'
   * @param {string} entityId
   * @param {object} previousValue
   * @param {object} newValue
   */
  log: function(userId, action, entityType, entityId, previousValue, newValue) {
    try {
      const now = new Date().toISOString();
      const auditId = 'AUD-' + Utilities.getUuid().substring(0, 8);
      SheetRepository.insert(APP_CONFIG.SHEET_TABS.AUDIT_LOG, {
        audit_id: auditId,
        user_id: userId || 'SYSTEM',
        action: action,
        entity_type: entityType,
        entity_id: entityId,
        previous_value: previousValue ? JSON.stringify(previousValue) : '',
        new_value: newValue ? JSON.stringify(newValue) : '',
        timestamp: now
      });
    } catch (e) {
      console.warn('Audit logging failed: ' + e.message);
    }
  }
};
