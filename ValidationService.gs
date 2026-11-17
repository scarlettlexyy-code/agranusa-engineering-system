/**
 * ValidationService.gs
 * Implements business validation rules and data sanitization.
 * Enforces business logic server-side per PRD Section 5 & 9.
 */

const ValidationService = {
  /**
   * Validate Activity payload
   */
  validateActivity: function(data) {
    const errors = [];
    if (!data.activity_date) errors.push('Tanggal aktivitas wajib diisi.');
    if (!data.job_name || String(data.job_name).trim() === '') errors.push('Nama pekerjaan wajib diisi.');
    if (!data.location_id) errors.push('Lokasi pekerjaan wajib dipilih.');
    
    const validStatuses = ['Done', 'Pending', 'In Progress'];
    if (!data.status || !validStatuses.includes(data.status)) {
      errors.push(`Status harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    // Business rule: Status Pending must have an explanation or note
    if (data.status === 'Pending' && (!data.notes || String(data.notes).trim() === '')) {
      errors.push('Wajib mengisi catatan/alasan penundaan untuk status Pending.');
    }

    if (!data.workers || (Array.isArray(data.workers) && data.workers.length === 0)) {
      errors.push('Minimal satu nama pekerja/teknisi harus dipilih.');
    }

    if (errors.length > 0) {
      throw new Error(`Validasi Aktivitas Gagal: ${errors.join(' ')}`);
    }

    return true;
  },

  /**
   * Validate Project payload
   */
  validateProject: function(data) {
    const errors = [];
    if (!data.project_name || String(data.project_name).trim() === '') errors.push('Nama proyek wajib diisi.');
    if (!data.objective || String(data.objective).trim() === '') errors.push('Tujuan proyek wajib diisi.');
    if (!data.location_id) errors.push('Lokasi proyek wajib diisi.');
    if (!data.start_date) errors.push('Tanggal mulai wajib diisi.');

    const progress = parseFloat(data.progress);
    if (isNaN(progress) || progress < 0 || progress > 100) {
      errors.push('Progress fisik harus berupa angka antara 0 dan 100%.');
    }

    const validStatuses = ['Planning', 'In Progress', 'On Hold', 'Completed'];
    if (!data.status || !validStatuses.includes(data.status)) {
      errors.push(`Status proyek harus salah satu dari: ${validStatuses.join(', ')}`);
    }

    if (errors.length > 0) {
      throw new Error(`Validasi Proyek Gagal: ${errors.join(' ')}`);
    }

    return true;
  },

  /**
   * Validate Energy payload and meter consistency
   */
  validateEnergy: function(data, previousReading) {
    const errors = [];
    const validCategories = ['Listrik PLN', 'Air PDAM', 'Gas LPG', 'Fuel Genset'];
    if (!data.category || !validCategories.includes(data.category)) {
      errors.push(`Kategori energi tidak valid. Harus salah satu dari: ${validCategories.join(', ')}`);
    }

    if (!data.record_date) errors.push('Tanggal pencatatan energi wajib diisi.');

    const validMethods = ['Daily Usage', 'Meter Reading'];
    if (!data.input_method || !validMethods.includes(data.input_method)) {
      errors.push(`Metode input harus salah satu dari: ${validMethods.join(', ')}`);
    }

    if (data.input_method === 'Daily Usage') {
      const usage = parseFloat(data.usage_value);
      if (isNaN(usage) || usage < 0) {
        errors.push('Nilai pemakaian langsung harus berupa angka positif.');
      }
    } else if (data.input_method === 'Meter Reading') {
      const meter = parseFloat(data.meter_reading);
      if (isNaN(meter) || meter < 0) {
        errors.push('Angka pembacaan meter harus berupa angka positif.');
      }
      if (previousReading !== null && previousReading !== undefined) {
        const prev = parseFloat(previousReading);
        if (!isNaN(prev) && meter < prev) {
          // Warning/Anomaly rule: meter drop
          // Does not completely block if flagged as anomaly/reset, but sets status
          data.validation_status = 'Anomali';
          data.notes = (data.notes ? data.notes + '; ' : '') + `Peringatan: Angka meter (${meter}) lebih kecil dari pembacaan sebelumnya (${prev}).`;
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validasi Energi Gagal: ${errors.join(' ')}`);
    }

    return true;
  },

  /**
   * Validate Purchase Summary payload
   */
  validatePurchase: function(data) {
    const errors = [];
    if (!data.reporting_period || !/^\d{4}-\d{2}$/.test(data.reporting_period)) {
      errors.push('Format periode pelaporan harus YYYY-MM (contoh: 2026-05).');
    }
    const amount = parseFloat(data.total_amount);
    if (isNaN(amount) || amount < 0) {
      errors.push('Total belanja harus berupa angka non-negatif.');
    }

    if (errors.length > 0) {
      throw new Error(`Validasi Belanja Gagal: ${errors.join(' ')}`);
    }

    return true;
  }
};
