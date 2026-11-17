/**
 * ProjectService.gs
 * Manages engineering capital expenditure (Capex) projects per PRD Section 5.3.
 */

const ProjectService = {
  /**
   * List projects with budget variance and KPI summary
   */
  list: function(params) {
    params = params || {};
    const projects = SheetRepository.getAll(APP_CONFIG.SHEET_TABS.PROJECTS);

    let filtered = projects.map(p => {
      const budget = parseFloat(p.budget) || 0;
      const cost = parseFloat(p.project_cost) || 0;
      const variance = budget - cost;
      const isOverBudget = budget > 0 && cost > budget;
      const overBudgetAmount = isOverBudget ? cost - budget : 0;

      // Check delay
      let isDelayed = false;
      if (p.target_end_date && p.status !== 'Completed') {
        const targetDate = new Date(p.target_end_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (targetDate < today) {
          isDelayed = true;
        }
      }

      return Object.assign({}, p, {
        budget: budget,
        project_cost: cost,
        variance: variance,
        isOverBudget: isOverBudget,
        overBudgetAmount: overBudgetAmount,
        isDelayed: isDelayed
      });
    });

    // Filter by status tab (Semua, Aktif, Perlu Perhatian, Selesai)
    if (params.filterTab === 'Aktif') {
      filtered = filtered.filter(p => p.status === 'In Progress');
    } else if (params.filterTab === 'Perlu Perhatian') {
      filtered = filtered.filter(p => p.isOverBudget || p.isDelayed || p.status === 'On Hold');
    } else if (params.filterTab === 'Selesai') {
      filtered = filtered.filter(p => p.status === 'Completed');
    }

    if (params.search) {
      const q = String(params.search).toLowerCase();
      filtered = filtered.filter(p =>
        String(p.project_id).toLowerCase().includes(q) ||
        String(p.project_name).toLowerCase().includes(q) ||
        String(p.objective).toLowerCase().includes(q) ||
        String(p.owner).toLowerCase().includes(q) ||
        String(p.location_id).toLowerCase().includes(q)
      );
    }

    // KPI Aggregation
    const allEnriched = projects.map(p => {
      const b = parseFloat(p.budget) || 0;
      const c = parseFloat(p.project_cost) || 0;
      return {
        status: p.status,
        budget: b,
        cost: c,
        isOverBudget: b > 0 && c > b,
        overAmount: (b > 0 && c > b) ? (c - b) : 0
      };
    });

    const totalProjects = allEnriched.length;
    const totalBudget = allEnriched.reduce((acc, p) => acc + p.budget, 0);
    const totalCost = allEnriched.reduce((acc, p) => acc + p.cost, 0);
    const overBudgetProjects = allEnriched.filter(p => p.isOverBudget);
    const totalOverBudget = overBudgetProjects.reduce((acc, p) => acc + p.overAmount, 0);

    const statusCounts = {
      Completed: allEnriched.filter(p => p.status === 'Completed').length,
      InProgress: allEnriched.filter(p => p.status === 'In Progress').length,
      Planning: allEnriched.filter(p => p.status === 'Planning').length,
      OnHold: allEnriched.filter(p => p.status === 'On Hold').length
    };

    return {
      success: true,
      kpis: {
        totalProjects: totalProjects,
        totalBudget: totalBudget,
        totalCost: totalCost,
        remainingBudget: Math.max(0, totalBudget - totalCost),
        overBudgetCount: overBudgetProjects.length,
        totalOverBudgetAmount: totalOverBudget,
        statusCounts: statusCounts
      },
      data: filtered
    };
  },

  /**
   * Create a new project
   */
  create: function(data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    ValidationService.validateProject(data);

    const now = new Date().toISOString();
    const year = data.start_date ? data.start_date.substring(0, 4) : '2026';
    const prefix = 'PRJ-' + year + '-';
    const projectId = SheetRepository.generateId(APP_CONFIG.SHEET_TABS.PROJECTS, 'project_id', prefix);

    const newProject = {
      project_id: projectId,
      project_name: data.project_name,
      objective: data.objective,
      description: data.description || '',
      location_id: data.location_id,
      start_date: data.start_date,
      target_end_date: data.target_end_date || '',
      owner: data.owner || '',
      budget: parseFloat(data.budget) || 0,
      project_cost: parseFloat(data.project_cost) || 0,
      progress: parseFloat(data.progress) || 0,
      status: data.status || 'Planning',
      notes: data.notes || '',
      created_at: now,
      updated_at: now
    };

    SheetRepository.insert(APP_CONFIG.SHEET_TABS.PROJECTS, newProject);
    AuditService.log(currentUser.userId, 'CREATE', 'PROJECT', projectId, null, newProject);

    return {
      success: true,
      projectId: projectId,
      message: 'Proyek Engineering Capex berhasil dibuat.',
      data: newProject
    };
  },

  /**
   * Update project details, cost, or progress
   */
  update: function(projectId, data, currentUser) {
    currentUser = currentUser || AuthService.getCurrentUser();
    const existing = SheetRepository.find(APP_CONFIG.SHEET_TABS.PROJECTS, 'project_id', projectId);
    if (!existing) throw new Error(`Proyek ${projectId} tidak ditemukan.`);

    ValidationService.validateProject(Object.assign({}, existing, data));

    const now = new Date().toISOString();
    const updates = {
      project_name: data.project_name !== undefined ? data.project_name : existing.project_name,
      objective: data.objective !== undefined ? data.objective : existing.objective,
      description: data.description !== undefined ? data.description : existing.description,
      location_id: data.location_id !== undefined ? data.location_id : existing.location_id,
      start_date: data.start_date !== undefined ? data.start_date : existing.start_date,
      target_end_date: data.target_end_date !== undefined ? data.target_end_date : existing.target_end_date,
      owner: data.owner !== undefined ? data.owner : existing.owner,
      budget: data.budget !== undefined ? (parseFloat(data.budget) || 0) : existing.budget,
      project_cost: data.project_cost !== undefined ? (parseFloat(data.project_cost) || 0) : existing.project_cost,
      progress: data.progress !== undefined ? (parseFloat(data.progress) || 0) : existing.progress,
      status: data.status !== undefined ? data.status : existing.status,
      notes: data.notes !== undefined ? data.notes : existing.notes,
      updated_at: now
    };

    SheetRepository.update(APP_CONFIG.SHEET_TABS.PROJECTS, 'project_id', projectId, updates);
    AuditService.log(currentUser.userId, 'UPDATE', 'PROJECT', projectId, existing, updates);

    return {
      success: true,
      message: `Proyek ${projectId} berhasil diperbarui.`,
      data: updates
    };
  }
};
