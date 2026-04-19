const STORAGE_KEYS = {
  theme: "jr-portfolio-theme",
  adminData: "jr-portfolio-admin-data",
};

const state = {
  data: null,
  dataSource: "unknown",
  theme: "light",
  projectFilter: "All",
  revealObserver: null,
  metricObserver: null,
  adminBound: false,
  adminAuthenticated: false,
};

const elements = {};

document.addEventListener("DOMContentLoaded", () => {
  cacheElements();
  initializeTheme();
  bindEvents();
  loadSite();
});

function cacheElements() {
  [
    "site-header",
    "brand-mark",
    "brand-name",
    "brand-tagline",
    "nav-toggle",
    "nav-panel",
    "nav-links",
    "theme-toggle",
    "header-cta",
    "hero-eyebrow",
    "hero-title",
    "hero-description",
    "hero-primary",
    "hero-secondary",
    "proof-strip",
    "hero-metrics",
    "hero-image",
    "hero-owner",
    "hero-owner-role",
    "hero-availability",
    "resume-actions",
    "spotlight-contact",
    "hero-mini-grid",
    "about-eyebrow",
    "about-title",
    "about-description",
    "about-story-kicker",
    "about-story-title",
    "about-summary",
    "about-stats",
    "about-meta",
    "about-grid",
    "services-eyebrow",
    "services-title",
    "services-description",
    "services-grid",
    "focus-eyebrow",
    "focus-title",
    "focus-description",
    "domain-grid",
    "projects-eyebrow",
    "projects-title",
    "projects-description",
    "project-filters",
    "project-grid",
    "experience-eyebrow",
    "experience-title",
    "experience-description",
    "experience-list",
    "skills-eyebrow",
    "skills-title",
    "skills-description",
    "skills-radar",
    "skills-summary",
    "skill-list",
    "tool-grid",
    "process-eyebrow",
    "process-title",
    "process-description",
    "process-grid",
    "contact-eyebrow",
    "contact-title",
    "contact-description",
    "contact-methods",
    "contact-form-title",
    "contact-form-note",
    "contact-form",
    "form-status",
    "footer-eyebrow",
    "footer-title",
    "footer-description",
    "footer-primary",
    "footer-secondary",
    "footer-brand-mark",
    "footer-brand-name",
    "footer-note",
    "footer-legal",
    "project-modal",
    "modal-close",
    "modal-media",
    "modal-category",
    "modal-title",
    "modal-details",
    "modal-problem",
    "modal-solution",
    "modal-impact",
    "modal-preview-link",
    "admin-trigger",
    "admin-modal",
    "admin-close",
    "admin-login",
    "admin-editor",
    "admin-login-form",
    "admin-id",
    "admin-password",
    "admin-login-status",
    "admin-json",
    "admin-source",
    "admin-format",
    "admin-download",
    "admin-reset",
    "admin-save",
    "admin-save-status",
    "admin-logout",
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function getStoredAdminData() {
  const raw = window.localStorage.getItem(STORAGE_KEYS.adminData);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    window.localStorage.removeItem(STORAGE_KEYS.adminData);
    return null;
  }
}

async function loadSite() {
  const localAdminData = getStoredAdminData();

  if (localAdminData) {
    state.data = normalizeSiteData(localAdminData);
    state.dataSource = "browser admin storage";
    hydratePage();
    return;
  }

  const sources = ["./data/company.json", "./data.json"];
  let lastError = null;

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Unable to load JSON data from ${source}. Status: ${response.status}`);
      }

      state.data = normalizeSiteData(await response.json());
      state.dataSource = source;
      hydratePage();
      return;
    } catch (error) {
      lastError = error;
    }
  }

  if (window.__SITE_DATA__) {
    state.data = normalizeSiteData(window.__SITE_DATA__);
    state.dataSource = "data/site-data.js fallback";
    hydratePage();
    return;
  }

  renderLoadError(lastError || new Error("No site data source could be loaded."));
}

function normalizeSiteData(rawData) {
  if (!rawData) {
    return rawData;
  }

  if (rawData.profile && !rawData.brand) {
    return normalizePortfolioData(normalizeStreamlitData(rawData));
  }

  return normalizePortfolioData(rawData);
}

function normalizePortfolioData(data) {
  const brand = data.brand || {};
  const skills = normalizeSkills(data.skills);
  const projects = (data.projects || []).map(normalizeProject);
  const experience = (data.experience || []).map(normalizeExperienceItem);
  const metrics = normalizeMetrics(data.metrics);
  const proofStrip = data.proofStrip?.length
    ? data.proofStrip
    : skills.map((skill) => skill.name);
  const contactMethods = normalizeContactMethods(
    mergeContactMethods(data.contact?.methods || [], buildContactMethodsFromBrand(brand)),
  );

  return {
    ...data,
    admin: {
      id: "admin",
      password: "admin",
      ...(data.admin || {}),
    },
    brand: {
      logoPath: "assets/jr-mark.svg",
      ...brand,
    },
    navigation: data.navigation?.length
      ? data.navigation
      : [
          { label: "Home", href: "#top" },
          { label: "About", href: "#about" },
          { label: "Projects", href: "#projects" },
          { label: "Experience", href: "#experience" },
          { label: "Skills", href: "#skills" },
          { label: "Contact", href: "#contact" },
        ],
    metrics,
    proofStrip,
    projects,
    experience,
    skills,
    toolGroups: data.toolGroups?.length ? data.toolGroups : buildToolGroupsFromSkills(skills),
    focusAreas: data.focusAreas?.length ? data.focusAreas : buildFocusAreasFromProjects(projects),
    services: data.services?.length ? data.services : buildDefaultServices(),
    process: data.process?.length ? data.process : buildDefaultProcess(),
    contact: {
      methods: contactMethods,
      form: {
        title: "Send a message",
        note: "Reach out for full-time roles, freelance dashboard work, BI automation, or just to connect.",
        submitUrl: brand.email ? `https://formsubmit.co/${brand.email}` : "",
        subject: `New portfolio inquiry - ${brand.companyName || brand.ownerName || "Portfolio"}`,
        template: "table",
        thankYouPath: "thanks.html",
        pendingMessage: "Sending your message...",
        successMessage: "Thanks, your message has been sent successfully. I'll get back to you soon.",
        errorMessage: `There was a problem sending your message. Please try again${brand.email ? ` or email ${brand.email} directly` : ""}.`,
        submittingLabel: "Sending...",
        ...(data.contact?.form || {}),
      },
    },
  };
}

function normalizeStreamlitData(data) {
  const profile = data.profile || {};
  const skills = normalizeSkills(data.skills);
  const projects = (data.projects || []).map(normalizeProject);
  const streamlitBrand = {
    companyName: profile.name || "Jithendra Reddy",
    logoPath: "assets/jr-mark.svg",
    ownerName: profile.name || "Jithendra Reddy",
    ownerRole: profile.role || profile.tagline || "Power BI Developer",
    tagline: profile.tagline || "Business Intelligence & Automation Architect",
    summary: profile.summary || "",
    location: profile.location || "",
    email: profile.email || "",
    phone: profile.phone || "",
    linkedin: profile.linkedin || "",
    resumeUrl: data.resumeUrl || profile.resumeUrl || profile.resume_url || "",
    profileImage: profile.image_url || "",
  };

  return {
    meta: {
      title: `${profile.name || "Jithendra Reddy"} | Power BI Developer Portfolio`,
      description: profile.summary || "Power BI portfolio featuring dashboards, automation, and analytics work.",
    },
    admin: {
      id: "admin",
      password: "admin",
      ...(data.admin || {}),
    },
    brand: streamlitBrand,
    navigation: [
      { label: "Home", href: "#top" },
      { label: "About", href: "#about" },
      { label: "Projects", href: "#projects" },
      { label: "Experience", href: "#experience" },
      { label: "Skills", href: "#skills" },
      { label: "Contact", href: "#contact" },
    ],
    hero: {
      eyebrow: buildHeroEyebrow(skills),
      title: "Power BI dashboards, analytics systems, and automation for clearer reporting and faster decisions.",
      description: "This portfolio highlights the dashboards, data models, workflow automation, and business-facing reporting work I've built across sales, finance, healthcare, and operations.",
      primaryCta: {
        label: "View portfolio",
        href: "#projects",
      },
      secondaryCta: {
        label: profile.resumeUrl || data.resumeUrl ? "View resume" : "Contact me",
        href: profile.resumeUrl || data.resumeUrl || "#contact",
      },
      availability: "Open to BI developer roles, reporting optimization work, automation projects, and recruiter conversations.",
      miniCards: [
        {
          label: "Dashboard delivery",
          title: "Business-ready reporting",
          text: "Power BI dashboards designed for decision-making across finance, sales, logistics, healthcare, and operations.",
        },
        {
          label: "Automation",
          title: "Less manual work",
          text: "Workflow design across Python, Power Automate, Logic Apps, and connected reporting processes.",
        },
        {
          label: "Modeling",
          title: "Cleaner logic and faster flow",
          text: "DAX, data modeling, and performance-aware design that keep reports useful after launch.",
        },
      ],
    },
    metrics: data.metrics,
    proofStrip: skills.map((skill) => skill.name),
    sections: {
      about: {
        eyebrow: "About me",
        title: "Power BI, automation, and data work shaped around clarity, speed, and business use.",
        description: "My work combines dashboard design, data modeling, and workflow automation to make reporting easier to trust.",
      },
      services: {
        eyebrow: "Capabilities",
        title: "What I build across BI, analytics, and reporting workflows",
        description: "The focus is not just visuals. It's models, automation, and reporting systems that hold up in real work.",
      },
      focusAreas: {
        eyebrow: "Domain experience",
        title: "The reporting problems and industries reflected in this portfolio",
        description: "Sales, finance, healthcare, and data quality workflows are the themes that show up most often.",
      },
      projects: {
        eyebrow: "Portfolio",
        title: "Selected dashboards, analytics builds, and data tools",
        description: "A mix of Power BI work, operational reporting, and hands-on automation projects.",
      },
      experience: {
        eyebrow: "Experience",
        title: "Roles where I've built dashboards, pipelines, and automation",
        description: "Recent work combines Power BI with SQL, Python, Microsoft automation tooling, and business-facing reporting.",
      },
      skills: {
        eyebrow: "Skills and tools",
        title: "Technical strengths across BI, automation, and analytics",
        description: "A quick view of the tools and strengths that show up most often across the work.",
      },
      process: {
        eyebrow: "Approach",
        title: "How I move from messy data to decision-ready output",
        description: "Business context, cleaner models, clearer interface design, and automation all matter in the final result.",
      },
      contact: {
        eyebrow: "Get in touch",
        title: "Interested in working together, hiring, or discussing BI work?",
        description: "Use the form for roles, freelance projects, collaboration, or portfolio conversations.",
      },
    },
    aboutStory: {
      kicker: "How I work",
      title: "Strong dashboards come from clean logic, business clarity, and delivery discipline.",
    },
    aboutCards: [
      {
        title: "Decision-first dashboards",
        copy: "I build around the questions stakeholders actually need answered instead of adding visuals just to make a report look busy.",
      },
      {
        title: "Maintainable models",
        copy: "DAX, star-schema thinking, and cleaner relationships help keep reports faster, easier to maintain, and more dependable.",
      },
      {
        title: "Automation mindset",
        copy: "Reporting gets stronger when workflows are improved too, so I use Python and Microsoft automation tools where they add real value.",
      },
    ],
    services: buildDefaultServices(),
    focusAreas: buildFocusAreasFromProjects(projects),
    projects,
    experience: (data.experience || []).map(normalizeExperienceItem),
    skills,
    toolGroups: buildToolGroupsFromSkills(skills),
    process: buildDefaultProcess(),
    contact: {
      methods: normalizeContactMethods(
        mergeContactMethods(profile.contact_info || [], buildContactMethodsFromBrand(streamlitBrand)),
      ),
      form: {
        title: "Send a message",
        note: "Reach out for full-time roles, freelance dashboard work, BI automation, or just to connect.",
        submitUrl: data.contact?.form?.submitUrl || (profile.email ? `https://formsubmit.co/${profile.email}` : ""),
        subject: `New portfolio inquiry - ${profile.name || "Jithendra Reddy"}`,
        template: "table",
        thankYouPath: "thanks.html",
        pendingMessage: "Sending your message...",
        successMessage: "Thanks, your message has been sent successfully. I'll get back to you soon.",
        errorMessage: `There was a problem sending your message. Please try again${profile.email ? ` or email ${profile.email} directly` : ""}.`,
        submittingLabel: "Sending...",
      },
    },
    footer: {
      eyebrow: "Open to opportunities",
      title: "Looking for someone who can build clean dashboards and automate reporting?",
      description: "I'm available for BI roles, freelance projects, dashboard optimization, and workflow automation work.",
      primaryCta: {
        label: "Contact me",
        href: "#contact",
      },
      secondaryCta: {
        label: profile.resumeUrl || data.resumeUrl ? "View resume" : "See projects",
        href: profile.resumeUrl || data.resumeUrl || "#projects",
      },
      note: "{owner} builds Power BI dashboards, analytics workflows, and automation focused on clarity, performance, and business usability.",
      legal: "Based in Bengaluru, India. Open to remote roles, freelance delivery, and collaboration across BI and automation work.",
    },
  };
}

const METRIC_FIELD_PRESETS = {
  dashboards: {
    label: "Power BI dashboards built",
    eyebrow: "Delivery",
    detail: "Dashboards, KPI views, and reporting systems delivered across business functions.",
  },
  manual_reduction: {
    label: "manual effort reduced",
    eyebrow: "Automation",
    detail: "Repeated reporting work reduced through workflow automation, cleaner inputs, and connected delivery flows.",
  },
  efficiency: {
    label: "efficiency improvement",
    eyebrow: "Impact",
    detail: "Faster reporting cycles, cleaner models, and more efficient business reporting outcomes.",
  },
};

function normalizeMetrics(metrics) {
  if (Array.isArray(metrics)) {
    return metrics
      .map((metric, index) => normalizeMetricConfig(metric, `metric_${index}`))
      .filter(Boolean);
  }

  if (metrics && typeof metrics === "object") {
    return Object.entries(metrics)
      .map(([key, value]) => normalizeMetricConfig(value, key))
      .filter(Boolean);
  }

  return [];
}

function normalizeMetricConfig(metricSource, key = "") {
  const preset = METRIC_FIELD_PRESETS[key] || {};
  const metricObject = metricSource && typeof metricSource === "object" && !Array.isArray(metricSource)
    ? metricSource
    : { value: metricSource };

  const label = metricObject.label || preset.label || formatMetricLabel(key);
  const eyebrow = metricObject.eyebrow || preset.eyebrow || "Metric";
  const detail = metricObject.detail || metricObject.description || preset.detail || "";
  const rawValue = metricObject.value ?? metricObject.metric ?? metricObject.amount ?? 0;
  const rawSuffix = metricObject.suffix;

  return parseMetricValue(rawValue, label, eyebrow, detail, rawSuffix);
}

function formatMetricLabel(key) {
  const normalized = String(key || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return "Metric";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function parseMetricValue(input, label, eyebrow, detail, suffixOverride) {
  const source = String(input ?? "0").trim();
  const match = source.match(/(-?\d+(?:\.\d+)?)(.*)/);
  const parsedSuffix = (match?.[2] || "").trim();
  const normalizedSuffix = suffixOverride === undefined || suffixOverride === null || suffixOverride === ""
    ? parsedSuffix
    : String(suffixOverride).trim();

  return {
    value: Number(match?.[1] || 0),
    suffix: normalizedSuffix,
    label,
    eyebrow,
    detail,
  };
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) {
    return skills.map((skill) => ({
      name: skill.name,
      value: Number(skill.value || 0),
    }));
  }

  if (skills && typeof skills === "object") {
    return Object.entries(skills).map(([name, value]) => ({
      name,
      value: Number(value || 0),
    }));
  }

  return [];
}

function normalizeProject(project) {
  const category = project.category === "Medical" ? "Healthcare" : (project.category || "Project");

  return {
    ...project,
    category,
    featured: Boolean(project.featured),
    preview: project.preview || project.dashboard_image || "",
    shortSummary: project.shortSummary || getProjectExcerpt(project.details || project.solution || project.impact || ""),
  };
}

function normalizeExperienceItem(item) {
  const highlights = Array.isArray(item.highlights) && item.highlights.length
    ? item.highlights
    : String(item.description || "")
        .split(/\n+/)
        .map((line) => line.replace(/^[\u2022\-\s]+/, "").trim())
        .filter(Boolean);

  return {
    ...item,
    summary: item.summary || highlights[0] || item.description || "",
    highlights,
  };
}

function normalizeContactMethods(methods) {
  return (methods || [])
    .map((method) => {
      const href = method.href || method.value || "";
      const label = method.label || method.category || "Contact";

      return {
        ...method,
        label,
        href: normalizeContactHref(href, label),
        value: method.value || href,
      };
    })
    .filter((method) => method.href || method.value);
}

function mergeContactMethods(primary, secondary) {
  const seen = new Set();

  return [...(primary || []), ...(secondary || [])].filter((method) => {
    const key = `${method.label || method.category || "contact"}::${method.href || method.value || ""}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function normalizeContactHref(value, label) {
  const raw = String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (/^(https?:|mailto:|tel:)/i.test(raw)) {
    return raw;
  }

  if (/@/.test(raw)) {
    return `mailto:${raw}`;
  }

  if (/^\+?[\d\s()-]+$/.test(raw)) {
    return `tel:${raw.replace(/[^\d+]/g, "")}`;
  }

  if (/linkedin/i.test(label)) {
    return `https://${raw.replace(/^https?:\/\//i, "")}`;
  }

  if (/location/i.test(label)) {
    return `https://maps.google.com/?q=${encodeURIComponent(raw)}`;
  }

  return raw;
}

function buildContactMethodsFromBrand(brand) {
  return [
    brand.email ? { label: "Email", value: brand.email, href: `mailto:${brand.email}` } : null,
    brand.phone ? { label: "Phone", value: brand.phone, href: `tel:${brand.phone.replace(/[^\d+]/g, "")}` } : null,
    brand.location ? { label: "Location", value: brand.location, href: `https://maps.google.com/?q=${encodeURIComponent(brand.location)}` } : null,
    brand.linkedin ? { label: "LinkedIn", value: brand.linkedin.replace(/^https?:\/\//i, ""), href: brand.linkedin } : null,
    brand.resumeUrl ? { label: "Resume", value: "Open the latest PDF resume", href: brand.resumeUrl } : null,
  ].filter(Boolean);
}

function buildHeroEyebrow(skills) {
  return skills
    .slice(0, 4)
    .map((skill) => skill.name)
    .join(" | ");
}

function buildDefaultServices() {
  return [
    {
      title: "Dashboard design and delivery",
      metric: "Power BI",
      summary: "Dashboards built for management, analysts, and operational teams that need a cleaner view of KPIs, trends, and exceptions.",
      bullets: [
        "Executive and operational dashboard design",
        "Interactive filters, drill-downs, and KPI storytelling",
        "Reporting layouts built for regular business use",
      ],
    },
    {
      title: "DAX and model optimization",
      metric: "Performance and reliability",
      summary: "Reports improved with cleaner measures, better model logic, and structures that are easier to maintain and scale.",
      bullets: [
        "Measure-first DAX patterns",
        "Model cleanup and schema redesign",
        "Refresh and usability improvements",
      ],
    },
    {
      title: "Automation and integration",
      metric: "Less manual effort",
      summary: "Connected workflows that reduce repeated reporting work across Power Platform, Python, SharePoint, and operational systems.",
      bullets: [
        "Oracle to reporting pipeline support",
        "Scheduled data preparation and file flows",
        "Automated reporting and delivery workflows",
      ],
    },
    {
      title: "Analysis and insight framing",
      metric: "Business-facing analysis",
      summary: "Practical reporting views for variance analysis, trend detection, comparisons, and business decision support.",
      bullets: [
        "Budget versus actuals analysis",
        "Period-over-period and rolling benchmark logic",
        "Insight framing for stakeholders",
      ],
    },
  ];
}

function buildDefaultProcess() {
  return [
    {
      step: "01",
      title: "Understand the business problem",
      text: "Start with the reporting questions, the users, the pain points, and the data sources behind the work.",
    },
    {
      step: "02",
      title: "Shape the model and logic",
      text: "Design the measures, dimensions, calculations, and refresh approach before the visuals do all the talking.",
    },
    {
      step: "03",
      title: "Design for clarity",
      text: "Build dashboard views that make KPIs, exceptions, comparisons, and trends easier to interpret and act on.",
    },
    {
      step: "04",
      title: "Refine and automate",
      text: "Improve the delivery flow with tuning, automation, and follow-up changes so the reporting stays useful after launch.",
    },
  ];
}

function buildFocusAreasFromProjects(projects) {
  const presentCategories = [...new Set(projects.map((project) => project.category))];
  const defaults = {
    Sales: {
      label: "Sales analytics",
      title: "Pipeline, leaderboard, and time-based sales reporting",
      copy: "Projects span open sales order analytics, performance leaderboards, period comparisons, and historical benchmarking.",
    },
    Finance: {
      label: "Finance reporting",
      title: "Budget variance and business performance visibility",
      copy: "Finance work focuses on actual-versus-budget reporting, reconciled source systems, and cleaner KPI visibility.",
    },
    Healthcare: {
      label: "Healthcare reporting",
      title: "Risk, quality, and performance monitoring",
      copy: "Healthcare dashboards focus on operational visibility, quality tracking, and risk-oriented reporting.",
    },
    Tools: {
      label: "Data quality tools",
      title: "Validation and reconciliation workflows",
      copy: "Tooling work includes browser-based validation, comparison workflows, and audit-friendly reporting support.",
    },
  };

  return presentCategories
    .map((category) => defaults[category])
    .filter(Boolean);
}

function buildToolGroupsFromSkills(skills) {
  const names = skills.map((skill) => skill.name);

  return [
    {
      title: "Analytics stack",
      description: "Core reporting and analytics tools used across dashboard builds and business analysis.",
      items: names.filter((name) => ["Power BI", "DAX", "SQL", "Python"].includes(name)).length
        ? names.filter((name) => ["Power BI", "DAX", "SQL", "Python"].includes(name))
        : names.slice(0, 4),
    },
    {
      title: "Automation stack",
      description: "Workflow and automation tools used to reduce repeated reporting effort.",
      items: names.filter((name) => /Power Automate|Power Apps|Logic Apps/i.test(name)).length
        ? names.filter((name) => /Power Automate|Power Apps|Logic Apps/i.test(name))
        : ["Power Automate", "Power Apps", "Azure Logic Apps"],
    },
    {
      title: "Delivery focus",
      description: "The themes that shape the way dashboards and models are built.",
      items: [
        "Business-aligned KPIs",
        "Time-intelligence logic",
        "Variance analysis",
        "Usability-first reporting",
      ],
    },
  ];
}

function getProjectExcerpt(text) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > 150 ? `${clean.slice(0, 147)}...` : clean;
}

function hydratePage() {
  const { meta, brand } = state.data;

  document.title = meta.title;
  updateMetaDescription(meta.description);

  renderBrand(brand);
  renderNavigation(state.data.navigation);
  renderHero();
  renderAbout();
  renderServices();
  renderProcess();
  renderFocusAreas();
  renderProjectFilters();
  renderProjects();
  renderExperience();
  renderSkills();
  renderContact();
  renderFooter();
  initializeRevealObserver();
  initializeSectionObserver();
  refreshRevealElements();
  updateHeaderState();
  initializeAdminPanel();
}

function renderBrand(brand) {
  text("brand-name", brand.companyName);
  text("brand-tagline", brand.tagline);
  text("footer-brand-name", brand.companyName);
  setBrandMark("brand-mark", brand.logoPath);
  setBrandMark("footer-brand-mark", brand.logoPath);

  if (elements["header-cta"]) {
    elements["header-cta"].setAttribute("href", "#contact");
    const label = elements["header-cta"].querySelector("[data-button-label]");
    if (label) {
      label.textContent = "Contact me";
    }
  }
}

function renderNavigation(links) {
  elements["nav-links"].innerHTML = links
    .map(
      (link) => `
        <li>
          <a class="nav-link" href="${link.href}" data-nav-link="${link.href}">${link.label}</a>
        </li>
      `,
    )
    .join("");
}

function renderHero() {
  const { hero, brand, metrics, proofStrip } = state.data;

  text("hero-eyebrow", hero.eyebrow);
  text("hero-title", hero.title);
  text("hero-description", hero.description);
  anchor("hero-primary", hero.primaryCta.label, hero.primaryCta.href);
  anchor("hero-secondary", hero.secondaryCta.label, hero.secondaryCta.href);
  setExternalLink("hero-secondary", hero.secondaryCta.href);
  text("hero-owner", brand.ownerName);
  text("hero-owner-role", brand.ownerRole);
  text("hero-availability", hero.availability);

  elements["hero-image"].src = brand.profileImage || "https://placehold.co/720x820/png?text=Profile";
  elements["hero-image"].alt = `${brand.ownerName} portrait`;

  elements["proof-strip"].innerHTML = proofStrip
    .map((item) => `<span class="proof-chip">${item}</span>`)
    .join("");

  elements["hero-metrics"].innerHTML = metrics
    .map(
      (metric) => `
        <article class="metric-card reveal" tabindex="0">
          <span class="metric-kicker">${metric.eyebrow || "Metric"}</span>
          <span class="metric-value count-up" data-target="${metric.value}" data-suffix="${metric.suffix}">
            0${metric.suffix}
          </span>
          <span class="metric-label">${metric.label}</span>
          ${metric.detail ? `<p class="metric-description">${metric.detail}</p>` : ""}
        </article>
      `,
    )
    .join("");

  elements["resume-actions"].innerHTML = renderResumeActions(brand);
  elements["spotlight-contact"].innerHTML = renderSpotlightContact(state.data.contact.methods);

  elements["hero-mini-grid"].innerHTML = hero.miniCards
    .map(
      (item) => `
        <article class="mini-card">
          <p class="card-kicker">${item.label}</p>
          <h3>${item.title}</h3>
          <p>${item.text}</p>
        </article>
      `,
    )
    .join("");
}

function renderAbout() {
  const { sections, brand, aboutCards, aboutStory, metrics } = state.data;

  renderHeading("about", sections.about);
  text("about-story-kicker", aboutStory.kicker);
  text("about-story-title", aboutStory.title);
  text("about-summary", brand.summary);

  elements["about-stats"].innerHTML = metrics
    .map(
      (metric) => `
        <article class="about-stat">
          <div class="about-stat-head">
            <span class="about-stat-kicker">${metric.eyebrow || "Delivery metric"}</span>
            <strong>${metric.value}${metric.suffix}</strong>
          </div>
          <span class="about-stat-label">${metric.label}</span>
          ${metric.detail ? `<p class="about-stat-note">${metric.detail}</p>` : ""}
        </article>
      `,
    )
    .join("");

  elements["about-meta"].innerHTML = [
    brand.ownerRole,
    brand.location,
    brand.email,
  ]
    .map((item) => `<span class="meta-chip">${item}</span>`)
    .join("");

  elements["about-grid"].innerHTML = aboutCards
    .map(
      (card) => `
        <article class="about-card reveal">
          <h3>${card.title}</h3>
          <p>${card.copy}</p>
        </article>
      `,
    )
    .join("");
}

function renderServices() {
  renderHeading("services", state.data.sections.services);

  elements["services-grid"].innerHTML = state.data.services
    .map(
      (service) => `
        <article class="service-card reveal">
          <div class="service-topline">
            <span class="service-metric">${service.metric}</span>
          </div>
          <h3>${service.title}</h3>
          <p>${service.summary}</p>
          <ul class="service-list">
            ${service.bullets.map((bullet) => `<li>${bullet}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function renderFocusAreas() {
  renderHeading("focus", state.data.sections.focusAreas);

  elements["domain-grid"].innerHTML = state.data.focusAreas
    .map(
      (item) => `
        <article class="domain-card reveal">
          <span class="domain-label">${item.label}</span>
          <h3>${item.title}</h3>
          <p>${item.copy}</p>
        </article>
      `,
    )
    .join("");
}

function renderProjectFilters() {
  const categories = ["All", ...new Set(state.data.projects.map((project) => project.category))];

  elements["project-filters"].innerHTML = categories
    .map(
      (category) => `
        <button
          class="filter-chip ${category === state.projectFilter ? "is-active" : ""}"
          type="button"
          data-project-filter="${category}"
        >
          ${category}
        </button>
      `,
    )
    .join("");
}

function renderProjects() {
  renderHeading("projects", state.data.sections.projects);

  const projects = state.projectFilter === "All"
    ? state.data.projects
    : state.data.projects.filter((project) => project.category === state.projectFilter);

  if (!projects.length) {
    elements["project-grid"].innerHTML = '<div class="empty-state">No projects are available for this filter yet.</div>';
    return;
  }

  elements["project-grid"].innerHTML = projects
    .map((project) => {
      const sourceIndex = state.data.projects.findIndex((item) => item.title === project.title);

      return `
        <article class="project-card reveal">
          <div class="project-media">
            <img src="${project.image}" alt="${project.title}" loading="lazy" onerror="this.src='https://placehold.co/900x600/png?text=Project+Preview'" />
            <span class="project-badge">${project.category}</span>
          </div>

          <div class="project-copy">
            <div class="project-topline">
              <span class="project-chip">${project.featured ? "Featured build" : "Project"}</span>
              <span class="project-chip">${project.category}</span>
            </div>

            <h3>${project.title}</h3>
            <p>${project.shortSummary}</p>

            <div class="project-brief">
              <div class="brief-item">
                <span>Problem</span>
                <p>${project.problem}</p>
              </div>
              <div class="brief-item">
                <span>Solution</span>
                <p>${project.solution}</p>
              </div>
              <div class="brief-item">
                <span>Impact</span>
                <p>${project.impact}</p>
              </div>
            </div>

            <button class="text-button" type="button" data-open-project="${sourceIndex}">
              View project details
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  refreshRevealElements();
}

function renderExperience() {
  renderHeading("experience", state.data.sections.experience);

  elements["experience-list"].innerHTML = state.data.experience
    .map(
      (item) => `
        <article class="timeline-card reveal">
          <span class="timeline-date">${item.date}</span>
          <h3>${item.role}</h3>
          <p class="timeline-company">${item.company}</p>
          <p class="timeline-summary">${item.summary}</p>
          <ul class="timeline-list">
            ${item.highlights.map((highlight) => `<li>${highlight}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function renderSkills() {
  const skills = state.data.skills || [];

  renderHeading("skills", state.data.sections.skills);
  text("skills-summary", buildSkillsSummary(skills));

  elements["skills-radar"].innerHTML = renderSkillsRadar(skills);

  elements["skill-list"].innerHTML = skills
    .map(
      (skill) => `
        <div class="skill-row">
          <div class="skill-head">
            <strong>${skill.name}</strong>
            <span>${skill.value}%</span>
          </div>
          <div class="skill-track">
            <div class="skill-fill" style="width:${skill.value}%"></div>
          </div>
        </div>
      `,
    )
    .join("");

  elements["tool-grid"].innerHTML = state.data.toolGroups
    .map(
      (group) => `
        <article class="tool-card">
          <h3>${group.title}</h3>
          <p>${group.description}</p>
          <ul class="tool-list">
            ${group.items.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </article>
      `,
    )
    .join("");
}

function renderProcess() {
  renderHeading("process", state.data.sections.process);

  elements["process-grid"].innerHTML = state.data.process
    .map(
      (step) => `
        <article class="process-card reveal">
          <span class="process-step">${step.step}</span>
          <h3>${step.title}</h3>
          <p>${step.text}</p>
        </article>
      `,
    )
    .join("");
}

function renderContact() {
  const contactFormConfig = state.data.contact.form;

  renderHeading("contact", state.data.sections.contact);
  text("contact-form-title", contactFormConfig.title);
  text("contact-form-note", contactFormConfig.note);

  elements["contact-methods"].innerHTML = state.data.contact.methods
    .map(
      (method) => `
        <a class="contact-method-card" href="${method.href}" ${shouldOpenNewTab(method.href) ? 'target="_blank" rel="noopener"' : ""}>
          <span class="contact-method-icon">
            ${renderContactMethodIcon(method)}
          </span>
          <div class="contact-method-copy">
            <h3>${method.label}</h3>
            <p>${formatContactValue(method)}</p>
          </div>
        </a>
      `,
    )
    .join("");

  configureContactForm();
}

function renderFooter() {
  const { footer, brand } = state.data;

  text("footer-eyebrow", footer.eyebrow);
  text("footer-title", footer.title);
  text("footer-description", footer.description);
  anchor("footer-primary", footer.primaryCta.label, footer.primaryCta.href);
  anchor("footer-secondary", footer.secondaryCta.label, footer.secondaryCta.href);
  setExternalLink("footer-secondary", footer.secondaryCta.href);
  text("footer-note", footer.note.replace("{owner}", brand.ownerName));
  text("footer-legal", footer.legal);
}

function renderHeading(prefix, section) {
  text(`${prefix}-eyebrow`, section.eyebrow);
  text(`${prefix}-title`, section.title);
  text(`${prefix}-description`, section.description);
}

function openProjectModal(index) {
  const project = state.data.projects[index];

  if (!project) {
    return;
  }

  text("modal-category", project.category);
  text("modal-title", project.title);
  text("modal-details", project.details);
  text("modal-problem", project.problem);
  text("modal-solution", project.solution);
  text("modal-impact", project.impact);

  elements["modal-media"].innerHTML = renderProjectMedia(project);

  const previewUrl = getProjectMediaUrl(project);

  if (previewUrl) {
    anchor("modal-preview-link", /\.(mp4|webm)(\?|$)/i.test(previewUrl) ? "Open project video" : "Open project media", previewUrl);
    setExternalLink("modal-preview-link", previewUrl);
    elements["modal-preview-link"].style.display = "inline-flex";
  } else {
    elements["modal-preview-link"].style.display = "none";
  }

  elements["project-modal"].classList.add("is-open");
  elements["project-modal"].setAttribute("aria-hidden", "false");
  syncModalBodyLock();
}

function renderProjectMedia(project) {
  const mediaUrl = getProjectMediaUrl(project);

  if (!mediaUrl) {
    return `<img src="${project.image}" alt="${project.title}" onerror="this.src='https://placehold.co/1200x760/png?text=Project+Preview'" />`;
  }

  if (/\.(mp4|webm)(\?|$)/i.test(mediaUrl)) {
    return `
      <video controls playsinline preload="metadata" poster="${project.image}">
        <source src="${mediaUrl}" />
      </video>
    `;
  }

  return `<img src="${mediaUrl}" alt="${project.title}" onerror="this.src='https://placehold.co/1200x760/png?text=Project+Preview'" />`;
}

function closeProjectModal() {
  elements["project-modal"].classList.remove("is-open");
  elements["project-modal"].setAttribute("aria-hidden", "true");
  elements["modal-media"].innerHTML = "";
  syncModalBodyLock();
}

function bindEvents() {
  window.addEventListener("scroll", updateHeaderState);

  elements["theme-toggle"].addEventListener("click", () => {
    setTheme(state.theme === "light" ? "dark" : "light");
  });

  elements["nav-toggle"].addEventListener("click", () => {
    const isOpen = elements["nav-panel"].classList.toggle("is-open");
    elements["nav-toggle"].setAttribute("aria-expanded", String(isOpen));
  });

  elements["contact-form"].addEventListener("submit", handleContactSubmit);
  elements["modal-close"].addEventListener("click", closeProjectModal);

  document.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-project-filter]");
    const projectButton = event.target.closest("[data-open-project]");
    const closeModalTrigger = event.target.closest("[data-close-modal]");
    const closeAdminTrigger = event.target.closest("[data-close-admin]");
    const navLink = event.target.closest(".nav-link");

    if (filterButton) {
      state.projectFilter = filterButton.dataset.projectFilter;
      renderProjectFilters();
      renderProjects();
    }

    if (projectButton) {
      openProjectModal(Number(projectButton.dataset.openProject));
    }

    if (closeModalTrigger) {
      closeProjectModal();
    }

    if (closeAdminTrigger) {
      closeAdminModal();
    }

    if (navLink && elements["nav-panel"].classList.contains("is-open")) {
      elements["nav-panel"].classList.remove("is-open");
      elements["nav-toggle"].setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProjectModal();
      closeAdminModal();
    }
  });

  bindAdminEvents();
}

function bindAdminEvents() {
  if (state.adminBound) {
    return;
  }

  elements["admin-trigger"]?.addEventListener("click", openAdminModal);
  elements["admin-close"]?.addEventListener("click", closeAdminModal);
  elements["admin-login-form"]?.addEventListener("submit", handleAdminLogin);
  elements["admin-format"]?.addEventListener("click", handleAdminFormat);
  elements["admin-download"]?.addEventListener("click", handleAdminDownload);
  elements["admin-reset"]?.addEventListener("click", handleAdminReset);
  elements["admin-save"]?.addEventListener("click", handleAdminSave);
  elements["admin-logout"]?.addEventListener("click", handleAdminLogout);

  state.adminBound = true;
}

function initializeAdminPanel() {
  if (!elements["admin-json"] || !elements["admin-source"]) {
    return;
  }

  elements["admin-source"].textContent = state.dataSource || "runtime data";
  elements["admin-json"].value = JSON.stringify(state.data, null, 2);
  setAdminMode(false);
}

function openAdminModal() {
  if (!elements["admin-modal"]) {
    return;
  }

  elements["admin-modal"].classList.add("is-open");
  elements["admin-modal"].setAttribute("aria-hidden", "false");
  syncModalBodyLock();
}

function closeAdminModal() {
  if (!elements["admin-modal"]) {
    return;
  }

  elements["admin-modal"].classList.remove("is-open");
  elements["admin-modal"].setAttribute("aria-hidden", "true");
  syncModalBodyLock();
}

function syncModalBodyLock() {
  document.body.classList.toggle("modal-open", document.querySelectorAll(".modal.is-open").length > 0);
}

function setAdminMode(isAuthenticated) {
  state.adminAuthenticated = isAuthenticated;

  if (elements["admin-login"]) {
    elements["admin-login"].hidden = isAuthenticated;
    elements["admin-login"].style.display = isAuthenticated ? "none" : "block";
  }

  if (elements["admin-editor"]) {
    elements["admin-editor"].hidden = !isAuthenticated;
    elements["admin-editor"].style.display = isAuthenticated ? "grid" : "none";
  }

  if (isAuthenticated) {
    setStatus("admin-login-status", "Logged in. You can now edit and apply portfolio JSON.", "success");
  } else {
    setStatus("admin-login-status", "", "");
  }
}

function handleAdminLogin(event) {
  event.preventDefault();

  const adminId = String(elements["admin-id"]?.value || "").trim();
  const adminPassword = String(elements["admin-password"]?.value || "");
  const expectedId = String(state.data?.admin?.id || "admin");
  const expectedPassword = String(state.data?.admin?.password || "admin");

  if (adminId !== expectedId || adminPassword !== expectedPassword) {
    setStatus("admin-login-status", "Invalid admin ID or password.", "error");
    return;
  }

  setAdminMode(true);
  setStatus("admin-save-status", "", "");
}

function handleAdminFormat() {
  const raw = String(elements["admin-json"]?.value || "").trim();

  if (!raw) {
    setStatus("admin-save-status", "Nothing to format.", "error");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    elements["admin-json"].value = JSON.stringify(parsed, null, 2);
    setStatus("admin-save-status", "JSON formatted.", "success");
  } catch (error) {
    setStatus("admin-save-status", "Cannot format because the JSON is invalid.", "error");
  }
}

function handleAdminDownload() {
  const raw = String(elements["admin-json"]?.value || "").trim();

  if (!raw) {
    setStatus("admin-save-status", "Nothing to download.", "error");
    return;
  }

  downloadTextFile(`portfolio-data-${new Date().toISOString().slice(0, 10)}.json`, raw);
  setStatus("admin-save-status", "JSON downloaded.", "success");
}

async function handleAdminReset() {
  const fallback = await loadDefaultSiteData();

  if (!fallback) {
    setStatus("admin-save-status", "Could not load bundled site data for reset.", "error");
    return;
  }

  elements["admin-json"].value = JSON.stringify(fallback.data, null, 2);
  elements["admin-source"].textContent = `${fallback.source} (reset loaded)`;
  setStatus("admin-save-status", "Editor reset to bundled site data. Click Save and apply changes.", "success");
}

function handleAdminSave() {
  const raw = String(elements["admin-json"]?.value || "").trim();

  if (!raw) {
    setStatus("admin-save-status", "JSON editor is empty.", "error");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.data = normalizeSiteData(parsed);
    state.dataSource = "browser admin storage";
    window.localStorage.setItem(STORAGE_KEYS.adminData, JSON.stringify(parsed));
    hydratePage();
    openAdminModal();
    setAdminMode(true);
    setStatus("admin-save-status", "Saved and applied successfully.", "success");
  } catch (error) {
    setStatus("admin-save-status", `Invalid JSON: ${error.message}`, "error");
  }
}

function handleAdminLogout() {
  setAdminMode(false);
  setStatus("admin-save-status", "", "");

  if (elements["admin-password"]) {
    elements["admin-password"].value = "";
  }
}

async function loadDefaultSiteData() {
  const sources = ["./data/company.json", "./data.json"];

  for (const source of sources) {
    try {
      const response = await fetch(source, { cache: "no-store" });

      if (!response.ok) {
        continue;
      }

      return {
        data: await response.json(),
        source,
      };
    } catch (error) {
      // Ignore and continue to fallback source.
    }
  }

  if (window.__SITE_DATA__) {
    return {
      data: window.__SITE_DATA__,
      source: "data/site-data.js fallback",
    };
  }

  return null;
}

function downloadTextFile(filename, contents) {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function setStatus(id, message, type) {
  const status = elements[id];

  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.remove("is-success", "is-error");

  if (type === "success") {
    status.classList.add("is-success");
    return;
  }

  if (type === "error") {
    status.classList.add("is-error");
  }
}

async function handleContactSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const payload = Object.fromEntries(new FormData(form).entries());
  const requiredFields = ["name", "email", "message"];
  const submitButton = form.querySelector('button[type="submit"]');
  const contactFormConfig = state.data.contact.form;
  let isValid = true;

  requiredFields.forEach((fieldName) => {
    const field = form.querySelector(`[name="${fieldName}"]`);
    const hasValue = String(payload[fieldName] || "").trim().length > 0;
    field.classList.toggle("is-invalid", !hasValue);
    if (!hasValue) {
      isValid = false;
    }
  });

  if (!isValid) {
    setFormStatus("Please complete every field before sending your message.", "error");
    return;
  }

  if (String(payload._honey || "").trim()) {
    setFormStatus(contactFormConfig.errorMessage, "error");
    return;
  }

  const endpoint = getContactSubmissionEndpoint();

  if (!endpoint) {
    setFormStatus("The form email endpoint is missing. Add it in data/company.json before going live.", "error");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = contactFormConfig.submittingLabel || "Sending...";
  }

  setFormStatus(contactFormConfig.pendingMessage || "Sending your message...", "");

  try {
    if (isAjaxContactEndpoint(endpoint)) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          message: payload.message,
        }),
      });

      if (!response.ok) {
        throw new Error(`Submission failed with status ${response.status}`);
      }

      form.reset();
      setFormStatus(contactFormConfig.successMessage || "Thanks, your message has been sent successfully.", "success");

      if (contactFormConfig.thankYouPath) {
        window.setTimeout(() => {
          window.location.href = getThankYouPageUrl(contactFormConfig.thankYouPath);
        }, 900);
      }

      return;
    }

    configureContactForm(payload);
    HTMLFormElement.prototype.submit.call(form);
  } catch (error) {
    setFormStatus(contactFormConfig.errorMessage || "There was a problem sending your message.", "error");

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Send message";
    }
  }
}

function setFormStatus(message, type) {
  elements["form-status"].textContent = message;
  elements["form-status"].classList.remove("is-success", "is-error");

  if (type === "success") {
    elements["form-status"].classList.add("is-success");
    return;
  }

  if (type === "error") {
    elements["form-status"].classList.add("is-error");
  }
}

function initializeTheme() {
  const storedTheme = window.localStorage.getItem(STORAGE_KEYS.theme);
  setTheme(storedTheme || "light", false);
}

function setTheme(theme, persist = true) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  elements["theme-toggle"].dataset.mode = theme;
  elements["theme-toggle"].setAttribute("aria-pressed", String(theme === "dark"));
  elements["theme-toggle"].setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );

  if (persist) {
    window.localStorage.setItem(STORAGE_KEYS.theme, theme);
  }
}

function initializeRevealObserver() {
  if (!("IntersectionObserver" in window)) {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
    document.querySelectorAll(".count-up").forEach((counter) => animateCounter(counter));
    return;
  }

  state.revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        state.revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16 },
  );

  state.metricObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        animateCounter(entry.target);
        state.metricObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.65 },
  );

  refreshRevealElements();
}

function refreshRevealElements() {
  document.querySelectorAll(".reveal").forEach((element) => {
    if (!element.dataset.revealBound) {
      element.dataset.revealBound = "true";
      if (state.revealObserver) {
        state.revealObserver.observe(element);
      } else {
        element.classList.add("is-visible");
      }
    }

    if (element.getBoundingClientRect().top < window.innerHeight - 40) {
      element.classList.add("is-visible");
    }
  });

  document.querySelectorAll(".count-up").forEach((counter) => {
    if (!counter.dataset.countBound) {
      counter.dataset.countBound = "true";
      if (state.metricObserver) {
        state.metricObserver.observe(counter);
      } else {
        animateCounter(counter);
      }
    }
  });
}

function animateCounter(element) {
  if (element.dataset.animated) {
    return;
  }

  const target = Number(element.dataset.target || 0);
  const suffix = element.dataset.suffix || "";
  const duration = 1100;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    element.textContent = `${current}${suffix}`;

    if (progress < 1) {
      window.requestAnimationFrame(step);
      return;
    }

    element.textContent = `${target}${suffix}`;
    element.dataset.animated = "true";
  }

  window.requestAnimationFrame(step);
}

function initializeSectionObserver() {
  if (!("IntersectionObserver" in window) || !state.data) {
    return;
  }

  const sections = state.data.navigation
    .map((item) => document.getElementById(item.href.replace("#", "")))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        const activeHref = `#${entry.target.id}`;
        document.querySelectorAll("[data-nav-link]").forEach((link) => {
          link.classList.toggle("is-active", link.getAttribute("href") === activeHref);
        });
      });
    },
    {
      rootMargin: "-38% 0px -45% 0px",
      threshold: 0.01,
    },
  );

  sections.forEach((section) => observer.observe(section));
}

function updateHeaderState() {
  elements["site-header"].classList.toggle("is-scrolled", window.scrollY > 18);
}

function renderLoadError(error) {
  const note = window.location.protocol === "file:"
    ? 'This portfolio is being opened from <code>file://</code>. If <code>data/company.json</code> or <code>data.json</code> cannot be fetched in your browser, use the bundled <code>data/site-data.js</code> fallback or serve this folder locally, for example with <code>python -m http.server 8080</code>, then open <code>http://localhost:8080</code>.'
    : `Unable to load JSON data: ${error.message}`;

  document.querySelector("main").innerHTML = `
    <section class="section-shell">
      <div class="container">
        <div class="load-error">
          <strong>Unable to load the site data.</strong>
          <p>${note}</p>
        </div>
      </div>
    </section>
  `;
}

function getContactSubmissionEndpoint() {
  const configuredEndpoint = state.data?.contact?.form?.submitUrl;

  if (configuredEndpoint) {
    return configuredEndpoint.replace("/ajax/", "/");
  }

  const recipient = state.data?.brand?.email;
  return recipient ? `https://formsubmit.co/${recipient}` : "";
}

function configureContactForm(payload = {}) {
  const form = elements["contact-form"];
  const contactFormConfig = state.data.contact.form;
  const companyName = state.data.brand.companyName;

  form.setAttribute("method", "POST");
  form.setAttribute("action", getContactSubmissionEndpoint());
  form.setAttribute("accept-charset", "UTF-8");

  setHiddenFieldValue(form, "_subject", contactFormConfig.subject || `New portfolio inquiry - ${companyName}`);
  setHiddenFieldValue(form, "_template", contactFormConfig.template || "table");
  setHiddenFieldValue(form, "_next", getThankYouPageUrl(contactFormConfig.thankYouPath || "thanks.html"));
  setHiddenFieldValue(form, "_url", window.location.href);
  setHiddenFieldValue(form, "_replyto", payload.email || form.querySelector('[name="email"]')?.value || "");
}

function isAjaxContactEndpoint(endpoint) {
  return /formspree\.io/i.test(endpoint) || state.data?.contact?.form?.mode === "ajax";
}

function getProjectMediaUrl(project) {
  return project.preview || project.dashboard_image || "";
}

function renderResumeActions(brand) {
  const actions = [];

  if (brand.resumeUrl) {
    actions.push(`
      <a class="button button-primary button-compact" href="${brand.resumeUrl}" target="_blank" rel="noopener">
        View resume
      </a>
    `);
    actions.push(`
      <a class="button button-secondary button-compact" href="${brand.resumeUrl}" target="_blank" rel="noopener" download>
        Download PDF
      </a>
    `);
  } else if (brand.linkedin) {
    actions.push(`
      <a class="button button-primary button-compact" href="${brand.linkedin}" target="_blank" rel="noopener">
        Open LinkedIn
      </a>
    `);
  }

  return actions.join("");
}

function renderSpotlightContact(methods) {
  return methods
    .filter((method) => !/resume/i.test(method.label))
    .slice(0, 3)
    .map(
      (method) => `
        <a class="contact-pill" href="${method.href}" ${shouldOpenNewTab(method.href) ? 'target="_blank" rel="noopener"' : ""}>
          <span class="contact-pill-label">${method.label}</span>
          <span class="contact-pill-value">${formatContactValue(method)}</span>
        </a>
      `,
    )
    .join("");
}

function renderContactMethodIcon(method) {
  if (method.icon) {
    return `<img src="${method.icon}" alt="" loading="lazy" />`;
  }

  const label = String(method.label || "").toLowerCase();

  if (label.includes("mail") || label.includes("email")) {
    return "<span>@</span>";
  }

  if (label.includes("linkedin")) {
    return "<span>in</span>";
  }

  if (label.includes("phone")) {
    return "<span>+</span>";
  }

  if (label.includes("resume")) {
    return "<span>PDF</span>";
  }

  if (label.includes("location")) {
    return "<span>MAP</span>";
  }

  return `<span>${method.label.slice(0, 2).toUpperCase()}</span>`;
}

function formatContactValue(method) {
  const value = String(method.value || "").trim();
  return value
    .replace(/^mailto:/i, "")
    .replace(/^tel:/i, "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function buildSkillsSummary(skills) {
  if (!skills.length) {
    return "A quick look at the tools I use most often across dashboard, automation, and analytics work.";
  }

  const strongest = [...skills]
    .sort((left, right) => right.value - left.value)
    .slice(0, 3)
    .map((skill) => `${skill.name} (${skill.value}%)`)
    .join(", ");

  return `Strongest in ${strongest}.`;
}

function renderSkillsRadar(skills) {
  if (!skills.length) {
    return "";
  }

  const radarSkills = skills.slice(0, 6);
  const size = 320;
  const center = size / 2;
  const radius = 112;
  const levels = 5;
  const step = (Math.PI * 2) / radarSkills.length;

  const grid = Array.from({ length: levels }, (_, index) => {
    const scale = (index + 1) / levels;
    return `
      <polygon
        points="${buildRadarPointSet(radarSkills, radius * scale, center, step)}"
        class="radar-grid-level"
      />
    `;
  }).join("");

  const axes = radarSkills
    .map((skill, index) => {
      const angle = (Math.PI / 2) + (step * index);
      const x = center + (Math.cos(angle) * radius);
      const y = center - (Math.sin(angle) * radius);
      const labelX = center + (Math.cos(angle) * (radius + 26));
      const labelY = center - (Math.sin(angle) * (radius + 26));
      const anchor = Math.cos(angle) > 0.25 ? "start" : (Math.cos(angle) < -0.25 ? "end" : "middle");

      return `
        <line x1="${center}" y1="${center}" x2="${x}" y2="${y}" class="radar-axis" />
        <text x="${labelX}" y="${labelY}" text-anchor="${anchor}" class="radar-label">${escapeHtml(skill.name)}</text>
      `;
    })
    .join("");

  const valuePoints = buildRadarPointSet(
    radarSkills,
    radius,
    center,
    step,
    (skill) => (Number(skill.value || 0) / 100),
  );

  return `
    <svg viewBox="0 0 ${size} ${size}" class="radar-svg" role="img" aria-label="Radar chart of core skills">
      ${grid}
      ${axes}
      <polygon points="${valuePoints}" class="radar-shape" />
      ${radarSkills
        .map((skill, index) => {
          const angle = (Math.PI / 2) + (step * index);
          const scale = Number(skill.value || 0) / 100;
          const x = center + (Math.cos(angle) * radius * scale);
          const y = center - (Math.sin(angle) * radius * scale);
          return `<circle cx="${x}" cy="${y}" r="4.5" class="radar-point" />`;
        })
        .join("")}
    </svg>
  `;
}

function buildRadarPointSet(skills, radius, center, step, scaleResolver = () => 1) {
  return skills
    .map((skill, index) => {
      const angle = (Math.PI / 2) + (step * index);
      const scale = scaleResolver(skill, index);
      const x = center + (Math.cos(angle) * radius * scale);
      const y = center - (Math.sin(angle) * radius * scale);
      return `${x},${y}`;
    })
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setHiddenFieldValue(form, name, value) {
  const field = form.querySelector(`[name="${name}"]`);

  if (field) {
    field.value = value;
  }
}

function getThankYouPageUrl(pathname) {
  const normalizedPath = pathname.replace(/^\.?\//, "");
  const url = new URL(window.location.href);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/[^/]*$/, normalizedPath);
  return url.toString();
}

function updateMetaDescription(description) {
  const meta = document.querySelector('meta[name="description"]');
  if (meta) {
    meta.setAttribute("content", description);
  }
}

function setBrandMark(id, logoPath) {
  if (!elements[id] || !logoPath) {
    return;
  }

  elements[id].style.backgroundImage = `url("${logoPath}")`;
}

function text(id, value) {
  if (elements[id]) {
    elements[id].textContent = value;
  }
}

function anchor(id, label, href) {
  if (!elements[id]) {
    return;
  }

  elements[id].textContent = label;
  elements[id].setAttribute("href", href);
}

function shouldOpenNewTab(href) {
  return /^https?:\/\//i.test(href);
}

function setExternalLink(id, href) {
  if (!elements[id]) {
    return;
  }

  if (shouldOpenNewTab(href)) {
    elements[id].setAttribute("target", "_blank");
    elements[id].setAttribute("rel", "noopener");
    return;
  }

  elements[id].removeAttribute("target");
  elements[id].removeAttribute("rel");
}
