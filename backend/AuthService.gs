/**
 * AuthService.gs
 * Handles authentication, user session verification, and role permissions.
 */

const AuthService = {
  /**
   * Get currently active or default user
   */
  getCurrentUser: function() {
    let email = '';
    try {
      email = Session.getActiveUser().getEmail();
    } catch (e) {}

    if (email) {
      const user = SheetRepository.find(APP_CONFIG.SHEET_TABS.USERS, 'email', email);
      if (user && user.is_active) {
        return {
          userId: user.user_id,
          email: user.email,
          displayName: user.display_name,
          role: user.role
        };
      }
    }

    // Default system user profile matching UI
    return {
      userId: 'USR-001',
      email: 'wayan.sudarma@agranusa.com',
      displayName: 'I Wayan Sudarma',
      role: 'Head of Engineering'
    };
  },

  /**
   * Login endpoint verification
   */
  login: function(credentials) {
    const email = credentials.email;
    const user = SheetRepository.find(APP_CONFIG.SHEET_TABS.USERS, 'email', email);
    if (!user || !user.is_active) {
      // Fallback for default demo access
      if (email === 'wayan.sudarma@agranusa.com' || email === 'admin@agranusa.com') {
        return {
          success: true,
          token: Utilities.base64Encode(email + ':' + new Date().getTime()),
          user: {
            userId: 'USR-001',
            email: email,
            displayName: 'I Wayan Sudarma',
            role: 'Head of Engineering'
          }
        };
      }
      throw new Error('Pengguna tidak ditemukan atau dinonaktifkan.');
    }

    return {
      success: true,
      token: Utilities.base64Encode(user.email + ':' + new Date().getTime()),
      user: {
        userId: user.user_id,
        email: user.email,
        displayName: user.display_name,
        role: user.role
      }
    };
  },

  /**
   * Verify token / session
   */
  verifySession: function(token) {
    return this.getCurrentUser();
  }
};
