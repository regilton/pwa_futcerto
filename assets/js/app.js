(function () {
  'use strict';

  var jobs = window.JOBIE_JOBS || [];
  var categories = window.JOBIE_CATEGORIES || [];
  var STORAGE_KEY = 'jobie-pwa-state-v1';
  var ONBOARDING_KEY = 'jobie-pwa-onboarded';
  var deferredPrompt = null;

  var defaultState = {
    favorites: ['2', '6'],
    applications: [
      { id: 'app-1', jobId: '2', status: 'Entrevista', date: '05 ago 2026', step: 3 },
      { id: 'app-2', jobId: '4', status: 'Em análise', date: '02 ago 2026', step: 2 },
      { id: 'app-3', jobId: '6', status: 'Enviada', date: '29 jul 2026', step: 1 }
    ],
    stats: { applied: 29, interviews: 3 },
    profile: {
      name: 'Ana Beatriz',
      role: 'Product Designer',
      location: 'Fortaleza, CE',
      completion: 82,
      email: 'ana.beatriz@email.com'
    }
  };

  var state = loadState();
  var ui = {
    route: 'home',
    previousRoute: 'home',
    selectedJobId: null,
    query: '',
    filters: { category: '', modes: [], types: [] },
    onboardingIndex: 0
  };

  var view = document.getElementById('view');
  var bottomNav = document.getElementById('bottom-nav');
  var modal = document.getElementById('modal');
  var toast = document.getElementById('toast');
  var onboarding = document.getElementById('onboarding');
  var networkStatus = document.getElementById('network-status');

  var icons = {
    home: 'home',
    search: 'search',
    applications: 'document',
    profile: 'user',
    saved: 'bookmark',
    bell: 'bell'
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return clone(defaultState);
      var parsed = JSON.parse(saved);
      return {
        favorites: Array.isArray(parsed.favorites) ? parsed.favorites : clone(defaultState.favorites),
        applications: Array.isArray(parsed.applications) ? parsed.applications : clone(defaultState.applications),
        stats: parsed.stats || clone(defaultState.stats),
        profile: parsed.profile || clone(defaultState.profile)
      };
    } catch (error) {
      return clone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function icon(name, className) {
    return '<svg class="icon ' + (className || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function companyLogo(job, size) {
    return '<span class="company-logo ' + (size || '') + '" style="--logo:' + escapeHtml(job.accent) + '">' +
      escapeHtml(job.logo) + '</span>';
  }

  function getJob(id) {
    return jobs.find(function (job) { return String(job.id) === String(id); });
  }

  function isSaved(id) {
    return state.favorites.indexOf(String(id)) !== -1;
  }

  function isApplied(id) {
    return state.applications.some(function (application) {
      return String(application.jobId) === String(id);
    });
  }

  function formatMode(mode) {
    return {
      remote: 'Remoto',
      hybrid: 'Híbrido',
      onsite: 'Presencial'
    }[mode] || mode;
  }

  function formatType(type) {
    return {
      fulltime: 'Tempo integral',
      parttime: 'Meio período',
      contract: 'Contrato'
    }[type] || type;
  }

  function shortName() {
    return state.profile.name.split(' ')[0];
  }

  function render() {
    syncRoute();
    bottomNav.classList.toggle('is-hidden', ui.route === 'details');
    updateNav();

    if (ui.route === 'home') renderHome();
    else if (ui.route === 'search') renderSearch();
    else if (ui.route === 'applications') renderApplications();
    else if (ui.route === 'profile') renderProfile();
    else if (ui.route === 'saved') renderSaved();
    else if (ui.route === 'details') renderDetails();
    else renderHome();
  }

  function syncRoute() {
    var hash = location.hash.replace(/^#\/?/, '');
    if (!hash) {
      ui.route = 'home';
      ui.selectedJobId = null;
      return;
    }
    var parts = hash.split('/');
    var route = parts[0];
    if (['home', 'search', 'applications', 'profile', 'saved', 'details'].indexOf(route) === -1) {
      route = 'home';
    }
    ui.route = route;
    ui.selectedJobId = route === 'details' ? parts[1] : null;
  }

  function navigate(route, id) {
    ui.previousRoute = ui.route === 'details' ? ui.previousRoute : ui.route;
    var target = '#/' + route + (id ? '/' + id : '');
    if (location.hash === target) render();
    else location.hash = target;
  }

  function updateNav() {
    Array.prototype.forEach.call(bottomNav.querySelectorAll('[data-route]'), function (button) {
      button.classList.toggle('active', button.getAttribute('data-route') === ui.route);
    });
  }

  function pageHeader(title, options) {
    options = options || {};
    var left = options.back
      ? '<button class="icon-button" data-action="back" aria-label="Voltar">' + icon('arrow-left') + '</button>'
      : '<div><span class="eyebrow">' + escapeHtml(options.eyebrow || 'Jobie') + '</span><h1>' + escapeHtml(title) + '</h1></div>';

    var right = options.action
      ? '<button class="icon-button ' + (options.active ? 'active' : '') + '" data-action="' + options.action + '" data-id="' + (options.id || '') + '" aria-label="' + escapeHtml(options.label || 'Ação') + '">' + icon(options.icon || 'bookmark') + '</button>'
      : '';

    return '<header class="page-header ' + (options.back ? 'compact' : '') + '">' + left +
      (options.back ? '<h1>' + escapeHtml(title) + '</h1>' : '') + right + '</header>';
  }

  function renderHome() {
    var featured = jobs.slice(0, 4).map(featureCard).join('');
    var latest = jobs.slice(4, 8).map(function (job) { return jobCard(job, true); }).join('');
    var categoryCards = categories.map(function (category) {
      return '<button class="category-card" data-action="category-search" data-category="' + escapeHtml(category.name) + '">' +
        '<span class="category-icon" style="--category:' + category.color + '">' + icon(category.icon) + '</span>' +
        '<span><strong>' + escapeHtml(category.name) + '</strong><small>' + category.count + ' vagas</small></span>' +
      '</button>';
    }).join('');

    view.innerHTML =
      '<div class="home-head">' +
        '<div class="avatar">AB<span class="online-dot"></span></div>' +
        '<div class="home-greeting"><span>Olá, ' + escapeHtml(shortName()) + '</span><h1>Encontre sua próxima oportunidade</h1></div>' +
        '<button class="icon-button notification" data-action="notify-demo" aria-label="Notificações">' + icon('bell') + '<i></i></button>' +
      '</div>' +
      '<form class="search-hero" id="home-search-form">' +
        icon('search') +
        '<input id="home-search" type="search" placeholder="Cargo, empresa ou habilidade" aria-label="Buscar vagas">' +
        '<button type="button" data-action="open-filter" aria-label="Abrir filtros">' + icon('sliders') + '</button>' +
      '</form>' +
      '<section class="stats-card">' +
        '<div><span class="stat-icon lavender">' + icon('send') + '</span><strong>' + state.stats.applied + '</strong><small>Vagas aplicadas</small></div>' +
        '<span class="stats-divider"></span>' +
        '<div><span class="stat-icon mint">' + icon('calendar') + '</span><strong>' + state.stats.interviews + '</strong><small>Entrevistas</small></div>' +
      '</section>' +
      sectionTitle('Categorias', 'Ver todas', 'go-search') +
      '<div class="category-grid">' + categoryCards + '</div>' +
      sectionTitle('Destaques para você', 'Explorar', 'go-search') +
      '<div class="featured-row">' + featured + '</div>' +
      sectionTitle('Novas oportunidades', 'Ver todas', 'go-search') +
      '<div class="job-list">' + latest + '</div>' +
      '<div class="bottom-space"></div>';
  }

  function sectionTitle(title, link, action) {
    return '<div class="section-title"><h2>' + escapeHtml(title) + '</h2>' +
      '<button data-action="' + action + '">' + escapeHtml(link) + '</button></div>';
  }

  function featureCard(job) {
    return '<article class="feature-card" data-action="open-job" data-id="' + job.id + '" tabindex="0">' +
      '<div class="feature-top">' + companyLogo(job) +
        '<button class="save-button ' + (isSaved(job.id) ? 'saved' : '') + '" data-action="toggle-save" data-id="' + job.id + '" aria-label="Salvar vaga">' + icon('bookmark') + '</button>' +
      '</div>' +
      '<span class="job-kicker">' + escapeHtml(job.company) + '</span>' +
      '<h3>' + escapeHtml(job.title) + '</h3>' +
      '<div class="tag-row"><span>' + formatType(job.type) + '</span><span>' + formatMode(job.mode) + '</span></div>' +
      '<div class="feature-meta"><strong>' + escapeHtml(job.salaryShort) + '</strong><small>' + icon('location') + escapeHtml(job.locationShort) + '</small></div>' +
    '</article>';
  }

  function jobCard(job, compact) {
    return '<article class="job-card ' + (compact ? 'compact' : '') + '" data-action="open-job" data-id="' + job.id + '" tabindex="0">' +
      companyLogo(job) +
      '<div class="job-card-body">' +
        '<span class="job-kicker">' + escapeHtml(job.company) + '</span>' +
        '<h3>' + escapeHtml(job.title) + '</h3>' +
        '<div class="job-meta"><span>' + icon('location') + escapeHtml(job.locationShort) + '</span><span>' + icon('briefcase') + formatMode(job.mode) + '</span></div>' +
        '<div class="job-card-bottom"><strong>' + escapeHtml(job.salaryShort) + '</strong><small>' + escapeHtml(job.posted) + '</small></div>' +
      '</div>' +
      '<button class="save-button ' + (isSaved(job.id) ? 'saved' : '') + '" data-action="toggle-save" data-id="' + job.id + '" aria-label="Salvar vaga">' + icon('bookmark') + '</button>' +
    '</article>';
  }

  function getFilteredJobs() {
    var query = ui.query.trim().toLowerCase();
    return jobs.filter(function (job) {
      var haystack = [job.title, job.company, job.location, job.category, job.tags.join(' ')].join(' ').toLowerCase();
      var matchesQuery = !query || haystack.indexOf(query) !== -1;
      var matchesCategory = !ui.filters.category || job.category === ui.filters.category;
      var matchesMode = !ui.filters.modes.length || ui.filters.modes.indexOf(job.mode) !== -1;
      var matchesType = !ui.filters.types.length || ui.filters.types.indexOf(job.type) !== -1;
      return matchesQuery && matchesCategory && matchesMode && matchesType;
    });
  }

  function activeFilterCount() {
    return (ui.filters.category ? 1 : 0) + ui.filters.modes.length + ui.filters.types.length;
  }

  function renderSearch() {
    var results = getFilteredJobs();
    var count = activeFilterCount();
    var chips = [];
    if (ui.filters.category) chips.push(filterSummaryChip(ui.filters.category, 'category', ui.filters.category));
    ui.filters.modes.forEach(function (mode) { chips.push(filterSummaryChip(formatMode(mode), 'modes', mode)); });
    ui.filters.types.forEach(function (type) { chips.push(filterSummaryChip(formatType(type), 'types', type)); });

    view.innerHTML =
      pageHeader('Explorar vagas', { eyebrow: 'Oportunidades' }) +
      '<div class="search-toolbar">' +
        '<label class="search-field">' + icon('search') +
          '<input id="search-input" type="search" value="' + escapeHtml(ui.query) + '" placeholder="Buscar cargo ou empresa" aria-label="Buscar vagas">' +
        '</label>' +
        '<button class="filter-button" data-action="open-filter" aria-label="Filtros">' + icon('sliders') + (count ? '<b>' + count + '</b>' : '') + '</button>' +
      '</div>' +
      (chips.length ? '<div class="active-filters">' + chips.join('') + '<button data-action="clear-filters">Limpar</button></div>' : '') +
      '<div class="result-line"><strong>' + results.length + ' vagas encontradas</strong><span>Mais recentes</span></div>' +
      '<div class="job-list">' + (results.length ? results.map(function (job) { return jobCard(job, false); }).join('') : emptyState('search', 'Nenhuma vaga encontrada', 'Tente remover algum filtro ou buscar outro termo.')) + '</div>' +
      '<div class="bottom-space"></div>';
  }

  function filterSummaryChip(label, group, value) {
    return '<button class="summary-chip" data-action="remove-filter" data-group="' + group + '" data-value="' + escapeHtml(value) + '">' +
      escapeHtml(label) + icon('close') + '</button>';
  }

  function renderSaved() {
    var savedJobs = jobs.filter(function (job) { return isSaved(job.id); });
    view.innerHTML =
      pageHeader('Vagas salvas', { back: true }) +
      '<div class="result-line"><strong>' + savedJobs.length + ' oportunidades</strong><span>Seus favoritos</span></div>' +
      '<div class="job-list">' +
        (savedJobs.length ? savedJobs.map(function (job) { return jobCard(job); }).join('') : emptyState('bookmark', 'Nenhuma vaga salva', 'Use o marcador nas vagas que deseja rever mais tarde.')) +
      '</div><div class="bottom-space"></div>';
  }

  function renderDetails() {
    var job = getJob(ui.selectedJobId);
    if (!job) {
      view.innerHTML = pageHeader('Vaga não encontrada', { back: true }) + emptyState('search', 'Essa vaga não está disponível', 'Volte para a busca e encontre outras oportunidades.');
      return;
    }

    var requirements = job.requirements.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
    var responsibilities = job.responsibilities.map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('');
    var tags = job.tags.map(function (tag) { return '<span>' + escapeHtml(tag) + '</span>'; }).join('');

    view.innerHTML =
      pageHeader('Detalhes da vaga', { back: true, action: 'toggle-save', id: job.id, icon: 'bookmark', label: 'Salvar vaga', active: isSaved(job.id) }) +
      '<section class="job-detail-hero">' +
        companyLogo(job, 'large') +
        '<span class="job-kicker">' + escapeHtml(job.company) + '</span>' +
        '<h2>' + escapeHtml(job.title) + '</h2>' +
        '<p>' + icon('location') + escapeHtml(job.location) + '</p>' +
        '<div class="detail-tags"><span>' + formatType(job.type) + '</span><span>' + formatMode(job.mode) + '</span><span>' + escapeHtml(job.level) + '</span></div>' +
      '</section>' +
      '<section class="salary-card">' +
        '<div><small>Faixa salarial</small><strong>' + escapeHtml(job.salary) + '</strong></div>' +
        '<div><small>Publicada</small><strong>' + escapeHtml(job.posted) + '</strong></div>' +
      '</section>' +
      '<section class="detail-section"><h3>Sobre a oportunidade</h3><p>' + escapeHtml(job.description) + '</p></section>' +
      '<section class="detail-section"><h3>Responsabilidades</h3><ul>' + responsibilities + '</ul></section>' +
      '<section class="detail-section"><h3>Requisitos</h3><ul>' + requirements + '</ul></section>' +
      '<section class="detail-section"><h3>Competências</h3><div class="skill-tags">' + tags + '</div></section>' +
      '<section class="company-card">' + companyLogo(job) + '<div><strong>' + escapeHtml(job.company) + '</strong><small>Empresa verificada</small></div>' + icon('chevron-right') + '</section>' +
      '<div class="detail-action">' +
        '<button class="secondary-action ' + (isSaved(job.id) ? 'saved' : '') + '" data-action="toggle-save" data-id="' + job.id + '" aria-label="Salvar">' + icon('bookmark') + '</button>' +
        '<button class="primary-action" data-action="' + (isApplied(job.id) ? 'already-applied' : 'open-apply') + '" data-id="' + job.id + '">' +
          (isApplied(job.id) ? icon('check') + 'Candidatura enviada' : 'Candidatar-se agora') +
        '</button>' +
      '</div>';
  }

  function renderApplications() {
    var applications = state.applications.slice();
    var steps = ['Enviada', 'Em análise', 'Entrevista', 'Oferta'];

    view.innerHTML =
      pageHeader('Minhas candidaturas', { eyebrow: 'Acompanhamento' }) +
      '<section class="application-summary">' +
        '<div><strong>' + applications.length + '</strong><span>Em andamento</span></div>' +
        '<div><strong>' + state.stats.interviews + '</strong><span>Entrevistas</span></div>' +
        '<div><strong>74%</strong><span>Aderência média</span></div>' +
      '</section>' +
      '<div class="tab-row"><button class="active">Ativas</button><button data-action="history-demo">Histórico</button></div>' +
      '<div class="application-list">' +
        (applications.length ? applications.map(function (application) {
          var job = getJob(application.jobId);
          if (!job) return '';
          var progress = steps.map(function (step, index) {
            return '<span class="' + (index < application.step ? 'done' : '') + '"><i></i><small>' + step + '</small></span>';
          }).join('');
          return '<article class="application-card" data-action="open-job" data-id="' + job.id + '">' +
            '<div class="application-card-head">' + companyLogo(job) +
              '<div><span class="job-kicker">' + escapeHtml(job.company) + '</span><h3>' + escapeHtml(job.title) + '</h3></div>' +
              '<span class="status-badge status-' + application.step + '">' + escapeHtml(application.status) + '</span>' +
            '</div>' +
            '<div class="application-progress">' + progress + '</div>' +
            '<div class="application-foot"><span>Atualizada em ' + escapeHtml(application.date) + '</span><button>Ver vaga ' + icon('chevron-right') + '</button></div>' +
          '</article>';
        }).join('') : emptyState('document', 'Nenhuma candidatura', 'Ao se candidatar, você acompanha todas as etapas aqui.')) +
      '</div><div class="bottom-space"></div>';
  }

  function renderProfile() {
    var profile = state.profile;
    view.innerHTML =
      pageHeader('Meu perfil', { eyebrow: 'Currículo profissional', action: 'open-saved', icon: 'bookmark', label: 'Vagas salvas' }) +
      '<section class="profile-card">' +
        '<div class="profile-avatar">AB<span>' + profile.completion + '%</span></div>' +
        '<div><h2>' + escapeHtml(profile.name) + '</h2><p>' + escapeHtml(profile.role) + '</p><small>' + icon('location') + escapeHtml(profile.location) + '</small></div>' +
        '<button data-action="edit-demo">' + icon('edit') + '</button>' +
      '</section>' +
      '<section class="completion-card"><div class="completion-head"><div><strong>Complete seu perfil</strong><span>Perfis completos recebem mais convites</span></div><b>' + profile.completion + '%</b></div><div class="progress-bar"><i style="width:' + profile.completion + '%"></i></div></section>' +
      '<div class="profile-metrics">' +
        '<button data-action="open-saved"><span>' + icon('bookmark') + '</span><strong>' + state.favorites.length + '</strong><small>Salvas</small></button>' +
        '<button data-route="applications"><span>' + icon('send') + '</span><strong>' + state.stats.applied + '</strong><small>Aplicadas</small></button>' +
        '<button data-action="notify-demo"><span>' + icon('eye') + '</span><strong>18</strong><small>Visualizações</small></button>' +
      '</div>' +
      '<section class="resume-card">' +
        '<div class="resume-title"><span>' + icon('document') + '</span><div><strong>Currículo principal</strong><small>ana-beatriz-product-designer.pdf</small></div><button data-action="resume-demo">' + icon('more') + '</button></div>' +
        '<div class="resume-info"><span>Atualizado há 4 dias</span><b>PDF · 1,8 MB</b></div>' +
      '</section>' +
      sectionTitle('Competências', 'Editar', 'edit-demo') +
      '<div class="skill-tags profile-skills"><span>Figma</span><span>Pesquisa UX</span><span>Design System</span><span>Prototipação</span><span>+4</span></div>' +
      '<section class="menu-card">' +
        menuItem('briefcase', 'Experiências profissionais', '3 cadastradas', 'edit-demo') +
        menuItem('graduation', 'Formação acadêmica', '2 cadastradas', 'edit-demo') +
        menuItem('bell', 'Preferências de vagas', 'Remoto e híbrido', 'edit-demo') +
        menuItem('shield', 'Privacidade e segurança', 'Conta protegida', 'edit-demo') +
      '</section>' +
      '<button class="install-button" data-action="install">' + icon('download') + '<span><strong>Instalar Jobie</strong><small>Adicione o aplicativo à tela inicial</small></span>' + icon('chevron-right') + '</button>' +
      '<button class="reset-button" data-action="reset-demo">Restaurar dados de demonstração</button>' +
      '<div class="app-version">Jobie PWA · versão 1.0.0</div><div class="bottom-space"></div>';
  }

  function menuItem(iconName, title, subtitle, action) {
    return '<button data-action="' + action + '"><span class="menu-icon">' + icon(iconName) + '</span><span><strong>' + escapeHtml(title) + '</strong><small>' + escapeHtml(subtitle) + '</small></span>' + icon('chevron-right') + '</button>';
  }

  function emptyState(iconName, title, text) {
    return '<div class="empty-state"><span>' + icon(iconName) + '</span><h3>' + escapeHtml(title) + '</h3><p>' + escapeHtml(text) + '</p><button data-action="go-search">Explorar vagas</button></div>';
  }

  function showFilterModal() {
    var categoryOptions = categories.map(function (category) {
      return filterChip('category', category.name, category.name, ui.filters.category === category.name);
    }).join('');
    var modes = [
      filterChip('modes', 'remote', 'Remoto', ui.filters.modes.indexOf('remote') !== -1),
      filterChip('modes', 'hybrid', 'Híbrido', ui.filters.modes.indexOf('hybrid') !== -1),
      filterChip('modes', 'onsite', 'Presencial', ui.filters.modes.indexOf('onsite') !== -1)
    ].join('');
    var types = [
      filterChip('types', 'fulltime', 'Tempo integral', ui.filters.types.indexOf('fulltime') !== -1),
      filterChip('types', 'parttime', 'Meio período', ui.filters.types.indexOf('parttime') !== -1),
      filterChip('types', 'contract', 'Contrato', ui.filters.types.indexOf('contract') !== -1)
    ].join('');

    showModal(
      '<div class="modal-handle"></div>' +
      '<div class="modal-title"><div><span class="eyebrow">Refine sua busca</span><h2>Filtros</h2></div><button data-action="close-modal">' + icon('close') + '</button></div>' +
      '<div class="filter-group"><h3>Categoria</h3><div class="filter-chips">' + categoryOptions + '</div></div>' +
      '<div class="filter-group"><h3>Modelo de trabalho</h3><div class="filter-chips">' + modes + '</div></div>' +
      '<div class="filter-group"><h3>Tipo de contrato</h3><div class="filter-chips">' + types + '</div></div>' +
      '<div class="modal-actions"><button class="text-action" data-action="clear-filters-modal">Limpar tudo</button><button class="primary-action" data-action="apply-filters">Mostrar ' + getFilteredJobs().length + ' vagas</button></div>'
    );
  }

  function filterChip(group, value, label, active) {
    return '<button class="filter-chip ' + (active ? 'active' : '') + '" data-action="toggle-filter" data-group="' + group + '" data-value="' + escapeHtml(value) + '">' +
      (active ? icon('check') : '') + escapeHtml(label) + '</button>';
  }

  function showApplicationModal(job) {
    showModal(
      '<div class="modal-handle"></div>' +
      '<div class="modal-title"><div><span class="eyebrow">Candidatura rápida</span><h2>' + escapeHtml(job.title) + '</h2></div><button data-action="close-modal">' + icon('close') + '</button></div>' +
      '<div class="apply-company">' + companyLogo(job) + '<div><strong>' + escapeHtml(job.company) + '</strong><small>' + escapeHtml(job.locationShort) + ' · ' + formatMode(job.mode) + '</small></div></div>' +
      '<form id="application-form" data-job-id="' + job.id + '">' +
        '<label class="form-label">Currículo selecionado<div class="selected-resume">' + icon('document') + '<span><strong>Currículo principal</strong><small>PDF · atualizado há 4 dias</small></span>' + icon('check') + '</div></label>' +
        '<label class="form-label">Mensagem ao recrutador<textarea name="message" rows="4" maxlength="500" placeholder="Conte brevemente por que essa vaga combina com você..."></textarea></label>' +
        '<label class="consent"><input type="checkbox" required><span>Confirmo que meus dados profissionais podem ser compartilhados com a empresa responsável por esta vaga.</span></label>' +
        '<button class="primary-action full" type="submit">Enviar candidatura</button>' +
      '</form>'
    );
  }

  function showModal(content) {
    modal.querySelector('.modal-sheet').innerHTML = content;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function showToast(message, tone) {
    toast.textContent = message;
    toast.className = 'toast show ' + (tone || '');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.className = 'toast';
    }, 2800);
  }

  function toggleSave(id) {
    id = String(id);
    var index = state.favorites.indexOf(id);
    if (index === -1) {
      state.favorites.push(id);
      showToast('Vaga salva nos favoritos', 'success');
    } else {
      state.favorites.splice(index, 1);
      showToast('Vaga removida dos favoritos');
    }
    saveState();
    render();
  }

  function toggleFilter(group, value) {
    if (group === 'category') {
      ui.filters.category = ui.filters.category === value ? '' : value;
    } else {
      var list = ui.filters[group];
      var index = list.indexOf(value);
      if (index === -1) list.push(value);
      else list.splice(index, 1);
    }
    showFilterModal();
  }

  function removeFilter(group, value) {
    if (group === 'category') ui.filters.category = '';
    else ui.filters[group] = ui.filters[group].filter(function (item) { return item !== value; });
    renderSearch();
  }

  function clearFilters() {
    ui.filters = { category: '', modes: [], types: [] };
  }

  function submitApplication(form) {
    var jobId = form.getAttribute('data-job-id');
    if (isApplied(jobId)) {
      closeModal();
      showToast('Você já se candidatou a esta vaga');
      return;
    }
    state.applications.unshift({
      id: 'app-' + Date.now(),
      jobId: jobId,
      status: 'Enviada',
      date: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
      step: 1
    });
    state.stats.applied += 1;
    saveState();
    closeModal();
    showToast('Candidatura enviada com sucesso!', 'success');
    render();
  }

  function renderOnboarding() {
    var slides = [
      { title: 'Encontre o trabalho que combina com você', text: 'Descubra oportunidades selecionadas para suas habilidades e objetivos.', scene: 'search-scene' },
      { title: 'Candidate-se de qualquer lugar', text: 'Use seu currículo, favorite vagas e envie candidaturas em poucos passos.', scene: 'apply-scene' },
      { title: 'Acompanhe cada etapa', text: 'Receba atualizações e acompanhe entrevistas e retornos em um só lugar.', scene: 'track-scene' }
    ];
    var slide = slides[ui.onboardingIndex];
    var dots = slides.map(function (_, index) {
      return '<i class="' + (index === ui.onboardingIndex ? 'active' : '') + '"></i>';
    }).join('');

    onboarding.innerHTML =
      '<button class="onboarding-skip" data-action="skip-onboarding">Pular</button>' +
      '<div class="onboarding-art ' + slide.scene + '">' +
        '<div class="art-circle"></div><div class="art-person"><i></i><b></b></div>' +
        '<div class="art-card card-one">' + icon('briefcase') + '<span><b>Nova vaga</b><small>Para você</small></span></div>' +
        '<div class="art-card card-two">' + icon(ui.onboardingIndex === 2 ? 'check' : 'star') + '<span><b>' + (ui.onboardingIndex === 2 ? 'Entrevista' : 'Match 94%') + '</b><small>Atualizado agora</small></span></div>' +
      '</div>' +
      '<div class="onboarding-copy"><span class="brand-mark small">J</span><h1>' + escapeHtml(slide.title) + '</h1><p>' + escapeHtml(slide.text) + '</p><div class="onboarding-dots">' + dots + '</div></div>' +
      '<button class="onboarding-next" data-action="next-onboarding">' + (ui.onboardingIndex === slides.length - 1 ? 'Começar agora' : 'Continuar') + icon('arrow-right') + '</button>';
  }

  function finishOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onboarding.classList.add('leaving');
    setTimeout(function () { onboarding.hidden = true; }, 300);
  }

  function handleClick(event) {
    var target = event.target.closest('[data-action], [data-route]');
    if (!target) {
      if (event.target === modal) closeModal();
      return;
    }

    if (target.hasAttribute('data-route')) {
      navigate(target.getAttribute('data-route'));
      return;
    }

    var action = target.getAttribute('data-action');
    var id = target.getAttribute('data-id');

    if (action === 'open-job') navigate('details', id);
    else if (action === 'toggle-save') {
      event.stopPropagation();
      toggleSave(id);
    }
    else if (action === 'back') {
      if (history.length > 1) history.back();
      else navigate(ui.previousRoute || 'home');
    }
    else if (action === 'go-search') navigate('search');
    else if (action === 'category-search') {
      ui.filters.category = target.getAttribute('data-category');
      navigate('search');
    }
    else if (action === 'open-filter') showFilterModal();
    else if (action === 'close-modal') closeModal();
    else if (action === 'toggle-filter') toggleFilter(target.getAttribute('data-group'), target.getAttribute('data-value'));
    else if (action === 'apply-filters') {
      closeModal();
      navigate('search');
      render();
    }
    else if (action === 'clear-filters' || action === 'clear-filters-modal') {
      clearFilters();
      if (action === 'clear-filters-modal') showFilterModal();
      else renderSearch();
    }
    else if (action === 'remove-filter') removeFilter(target.getAttribute('data-group'), target.getAttribute('data-value'));
    else if (action === 'open-apply') showApplicationModal(getJob(id));
    else if (action === 'already-applied') showToast('Essa candidatura já está em acompanhamento');
    else if (action === 'open-saved') navigate('saved');
    else if (action === 'next-onboarding') {
      if (ui.onboardingIndex < 2) {
        ui.onboardingIndex += 1;
        renderOnboarding();
      } else finishOnboarding();
    }
    else if (action === 'skip-onboarding') finishOnboarding();
    else if (action === 'install') installApp();
    else if (action === 'reset-demo') resetDemo();
    else if (['notify-demo', 'edit-demo', 'resume-demo', 'history-demo'].indexOf(action) !== -1) {
      showToast('Recurso preparado para integração com o backend');
    }
  }

  function handleSubmit(event) {
    if (event.target.id === 'home-search-form') {
      event.preventDefault();
      ui.query = document.getElementById('home-search').value;
      navigate('search');
    } else if (event.target.id === 'application-form') {
      event.preventDefault();
      submitApplication(event.target);
    }
  }

  function handleInput(event) {
    if (event.target.id === 'search-input') {
      ui.query = event.target.value;
      clearTimeout(handleInput.timer);
      handleInput.timer = setTimeout(renderSearch, 180);
    }
  }

  function resetDemo() {
    state = clone(defaultState);
    saveState();
    showToast('Dados de demonstração restaurados', 'success');
    render();
  }

  function installApp() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { deferredPrompt = null; });
    } else {
      showToast('No iPhone, use Compartilhar e depois “Adicionar à Tela de Início”');
    }
  }

  function updateNetworkStatus() {
    var online = navigator.onLine;
    networkStatus.textContent = online ? 'Conexão restaurada' : 'Você está offline';
    networkStatus.className = 'network-status ' + (online ? 'online' : 'offline') + ' visible';
    clearTimeout(updateNetworkStatus.timer);
    updateNetworkStatus.timer = setTimeout(function () {
      networkStatus.classList.remove('visible');
    }, online ? 1800 : 4500);
  }

  document.addEventListener('click', handleClick);
  document.addEventListener('submit', handleSubmit);
  document.addEventListener('input', handleInput);
  window.addEventListener('hashchange', render);
  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferredPrompt = event;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function () {
        showToast('Não foi possível ativar o modo offline');
      });
    });
  }

  if (!localStorage.getItem(ONBOARDING_KEY)) {
    onboarding.hidden = false;
    renderOnboarding();
  } else {
    onboarding.hidden = true;
  }

  render();
})();