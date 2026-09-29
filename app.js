/* =========================================================
   MY NOTES HUB
   Notes / Categories (folders) / Trash application
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIGURATION
  ======================================================= */

  const STORAGE_KEY = "my_notes_hub_data_v4";
  const THEME_KEY = "my_notes_hub_theme";
  const PROFILE_KEY = "my_notes_hub_profile";

  const DEFAULT_PROFILE = {
    name: "Vikas",
    email: "",
    role: "HR & Recruitment",
    description:
      "Managing recruitment operations, job applications, recruiter coordination, training and workflow management.",
    photo: null
  };

  /* Light color themes used for folder / content cards */
  const COLORS = [
    { bg: "#fff8e8", soft: "#fffdf5", icon: "#fff0bd", border: "#f3d98b", accent: "#a47700" },
    { bg: "#eef9ff", soft: "#f8fdff", icon: "#d8f0ff", border: "#a9dcf7", accent: "#2178a8" },
    { bg: "#f4efff", soft: "#faf8ff", icon: "#e5dcff", border: "#cdbdf8", accent: "#6545b5" },
    { bg: "#effbf4", soft: "#f8fffb", icon: "#d7f5e3", border: "#a9e3bf", accent: "#2a8654" },
    { bg: "#fff0f4", soft: "#fff8fa", icon: "#ffdce6", border: "#f3b7c8", accent: "#b83d63" },
    { bg: "#fff4ed", soft: "#fffaf7", icon: "#ffe3d3", border: "#f4c3a5", accent: "#a95e31" },
    { bg: "#eef8f8", soft: "#f8ffff", icon: "#d6eeee", border: "#a8dada", accent: "#287b7b" },
    { bg: "#f5f6ff", soft: "#fafbff", icon: "#e2e5ff", border: "#c5cbf6", accent: "#5364b8" }
  ];

  /* =======================================================
     NAVIGATION
     Every item except dashboard / trash is a "section".
     A section holds folders (categories); a folder holds content.
  ======================================================= */

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", color: "#6C63FF", desc: "" },
    { id: "all-notes", label: "All Notes", icon: "📝", color: "#4C8DFF", desc: "Create your own categories and store different types of information." },
    { id: "work", label: "Work", icon: "💼", color: "#3AB795", desc: "Work-related categories, notes and files." },
    { id: "personal", label: "Personal", icon: "👤", color: "#46B4B0", desc: "Your personal notes and information." },
    { id: "ideas", label: "Ideas", icon: "💡", color: "#F5A623", desc: "Capture ideas before they disappear." },
    { id: "important", label: "Important", icon: "⭐", color: "#EF5DA8", desc: "Things you must not forget." },
    { id: "tasks", label: "Tasks", icon: "✅", color: "#5C9DED", desc: "Create task lists and tick items off as you finish them." },
    { id: "links", label: "Links", icon: "🔗", color: "#8E5CF7", desc: "Useful links and bookmarks." },
    { id: "documents", label: "Documents", icon: "📄", color: "#E0764A", desc: "Documents and files you want to keep." },
    { id: "screenshots", label: "Screenshots", icon: "📸", color: "#4FA6E0", desc: "Saved screenshots and images." },
    { id: "contacts", label: "Contacts", icon: "👥", color: "#C2554E", desc: "People and contact details." },
    { id: "travel", label: "Travel", icon: "✈️", color: "#35A7A0", desc: "Trip plans, tickets and travel notes." },
    { id: "finance", label: "Finance", icon: "💰", color: "#C98A2E", desc: "Money notes, bills and records." },
    { id: "health", label: "Health", icon: "❤️", color: "#E14F63", desc: "Health records and reminders." },
    { id: "learning", label: "Learning", icon: "📚", color: "#6E56CF", desc: "Courses, study notes and resources." },
    { id: "trash", label: "Trash", icon: "🗑️", color: "#B23B5E", desc: "" }
  ];

  const NON_SECTION_ROUTES = new Set(["dashboard", "settings", "trash"]);

  const CONTENT_TYPES = [
    { type: "text", icon: "📝", label: "Text Note" },
    { type: "article", icon: "📄", label: "Article" },
    { type: "image", icon: "🖼️", label: "Image" },
    { type: "screenshot", icon: "📸", label: "Screenshot" },
    { type: "url", icon: "🔗", label: "URL / Link" },
    { type: "file", icon: "📁", label: "File / Document" },
    { type: "voice", icon: "🎙️", label: "Voice Note" }
  ];

  /* =======================================================
     APPLICATION STATE
  ======================================================= */

  let state = {
    currentRoute: "dashboard",
    openFolderId: null,
    search: "",
    data: loadData(),
    profile: loadProfile()
  };

  /* Profile photo picked in Settings but not saved yet.
     undefined = unchanged, null = removed, string = new photo (data URL) */
  let pendingProfilePhoto;

  let clockInterval = null;

  /* =======================================================
     INITIALIZE
  ======================================================= */

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    loadTheme();
    renderSidebar();
    bindGlobalEvents();
    render();
    updateAvatar();
  }

  /* =======================================================
     STORAGE (+ migration from the older data layout)
  ======================================================= */

  function migrateCategory(category) {
    if (!category || typeof category !== "object") return null;

    if (!Array.isArray(category.contents)) category.contents = [];

    // Old layout: each sidebar page had one hidden "system" category.
    // Keep it (as a folder in that section) only if it holds content.
    if (category.systemRoute) {
      if (!category.contents.length) return null;
      category.section = category.systemRoute;
    }

    if (!category.section) category.section = "all-notes";

    delete category.systemRoute;

    return category;
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) return { categories: [], trash: [] };

      const parsed = JSON.parse(saved);

      const categories = (Array.isArray(parsed.categories) ? parsed.categories : [])
        .map(migrateCategory)
        .filter(Boolean);

      const trash = [];

      (Array.isArray(parsed.trash) ? parsed.trash : []).forEach(item => {
        if (item.originalType === "category") {
          const migrated = migrateCategory(item.originalData);
          if (!migrated) return;
          item.originalData = migrated;
        }
        trash.push(item);
      });

      return { categories, trash };
    } catch (error) {
      console.error("Storage load error:", error);
      return { categories: [], trash: [] };
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    } catch (error) {
      console.error("Storage save error:", error);
      showToast("Unable to save data in browser storage.", "error");
    }
  }

  function loadProfile() {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      return saved ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) } : { ...DEFAULT_PROFILE };
    } catch {
      return { ...DEFAULT_PROFILE };
    }
  }

  function saveProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));
      return true;
    } catch (error) {
      console.error("Profile save error:", error);
      showToast("Unable to save profile in browser storage.", "error");
      return false;
    }
  }

  /* =======================================================
     HELPERS: ids, colors
  ======================================================= */

  function uid(prefix = "id") {
    return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
  }

  function randomColor() {
    return COLORS[Math.floor(Math.random() * COLORS.length)];
  }

  function colorStyle(color) {
    const c = color || randomColor();
    return `--theme-bg:${c.bg};--theme-soft:${c.soft};--theme-icon-bg:${c.icon};--theme-border:${c.border};--theme-accent:${c.accent};`;
  }

  /* =======================================================
     SECTION / FOLDER HELPERS
  ======================================================= */

  function isSectionRoute(route) {
    return NAV_ITEMS.some(n => n.id === route) && !NON_SECTION_ROUTES.has(route);
  }

  function getNavItem(route) {
    return NAV_ITEMS.find(n => n.id === route);
  }

  function getSectionCategories(section) {
    return state.data.categories.filter(c => c.section === section);
  }

  function getRouteCount(route) {
    if (route === "trash") return state.data.trash.length;

    if (!isSectionRoute(route)) return 0;

    return getSectionCategories(route).reduce((total, c) => total + c.contents.length, 0);
  }

  function findCategory(categoryId) {
    return state.data.categories.find(c => c.id === categoryId);
  }

  function taskStats(category) {
    const total = category.contents.length;
    const done = category.contents.filter(c => c.done).length;
    return { total, done };
  }

  /* =======================================================
     SIDEBAR
  ======================================================= */

  function renderSidebar() {
    const nav = document.getElementById("sidebarNav");

    if (!nav) return;

    nav.innerHTML = "";

    NAV_ITEMS.forEach(item => {
      const count = getRouteCount(item.id);

      const button = document.createElement("button");

      button.type = "button";
      button.className = "nav-item" + (state.currentRoute === item.id ? " active" : "");
      button.dataset.route = item.id;
      button.style.background = item.color;
      button.style.color = "#fff";

      button.innerHTML = `
        <span class="nav-icon">${item.icon}</span>
        <span>${escapeHtml(item.label)}</span>
        ${count > 0 ? `<span class="nav-count">${count}</span>` : ""}
      `;

      nav.appendChild(button);
    });

    // keep the Settings button highlighted when open
    const settingsBtn = document.querySelector('.sidebar-bottom [data-route="settings"]');
    if (settingsBtn) settingsBtn.classList.toggle("active", state.currentRoute === "settings");
  }

  /* =======================================================
     GLOBAL EVENTS
  ======================================================= */

  function bindGlobalEvents() {
    document.addEventListener("click", handleClick);
    document.addEventListener("change", handleChange);
    document.addEventListener("keydown", handleKeydown);

    const search = document.getElementById("globalSearch");

    if (search) {
      search.addEventListener("input", event => {
        state.search = event.target.value.trim().toLowerCase();
        render();
      });
    }

    const themeBtn = document.getElementById("themeBtn");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    const sidebarToggle = document.getElementById("sidebarToggle");
    if (sidebarToggle) sidebarToggle.addEventListener("click", toggleSidebar);

    const mobileMenu = document.getElementById("mobileMenu");
    if (mobileMenu) mobileMenu.addEventListener("click", toggleSidebar);

    const avatar = document.getElementById("topAvatar");
    if (avatar) avatar.addEventListener("click", () => navigate("settings"));
  }

  function handleClick(event) {
    // Clicking anywhere outside an "Add Content" dropdown closes it
    if (!event.target.closest(".add-content")) hideContentMenus();

    const target = event.target.closest("[data-route], [data-action]");

    if (!target) return;

    if (target.dataset.route) {
      navigate(target.dataset.route);
      return;
    }

    const action = target.dataset.action;

    switch (action) {

      case "add-category":
        openCategoryModal();
        break;

      case "open-folder":
        openFolder(target.dataset.categoryId);
        break;

      case "close-folder":
        state.openFolderId = null;
        render();
        break;

      case "open-content-menu":
        toggleContentMenuById(target.dataset.categoryId);
        break;

      case "add-content":
        hideContentMenus();
        openContentModal(target.dataset.categoryId, target.dataset.contentType);
        break;

      case "copy-content":
        copyContentToClipboard(target.dataset.categoryId, target.dataset.contentId);
        break;

      case "edit-category":
        openCategoryModal(target.dataset.categoryId);
        break;

      case "delete-category":
        moveCategoryToTrash(target.dataset.categoryId);
        break;

      case "edit-content":
        openContentModal(target.dataset.categoryId, null, target.dataset.contentId);
        break;

      case "delete-content":
        moveContentToTrash(target.dataset.categoryId, target.dataset.contentId);
        break;

      case "restore-trash":
        restoreTrashItem(target.dataset.trashId);
        break;

      case "permanent-delete":
        permanentlyDeleteTrashItem(target.dataset.trashId);
        break;

      case "empty-trash":
        emptyTrash();
        break;

      case "save-profile":
        saveProfileFromForm();
        break;

      case "remove-profile-photo":
        removeProfilePhoto();
        break;

      case "close-modal":
      case "cancel-modal":
        closeModal();
        break;
    }
  }

  function handleChange(event) {
    const el = event.target;

    if (!el) return;

    if (el.id === "contentFileInput") showSelectedFile(el);

    if (el.id === "profilePhotoInput") previewProfilePhoto(el);

    if (el.matches && el.matches("[data-task-toggle]")) {
      toggleTask(el.dataset.categoryId, el.dataset.contentId, el.checked);
    }
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      closeModal();
      hideContentMenus();
      return;
    }

    // Open a folder card with Enter / Space
    if ((event.key === "Enter" || event.key === " ") && event.target.classList) {
      if (event.target.classList.contains("folder-card")) {
        event.preventDefault();
        openFolder(event.target.dataset.categoryId);
      }
    }
  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigate(route) {
    state.currentRoute = route;
    state.openFolderId = null;
    pendingProfilePhoto = undefined;

    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.remove("open");

    renderSidebar();
    render();
  }

  function openFolder(categoryId) {
    if (!findCategory(categoryId)) return;
    state.openFolderId = categoryId;
    render();
    window.scrollTo({ top: 0 });
  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render() {
    const page = document.getElementById("page");

    if (!page) return;

    if (state.currentRoute !== "dashboard" && clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }

    switch (state.currentRoute) {
      case "dashboard": renderDashboard(page); return;
      case "settings": renderSettings(page); return;
      case "trash": renderTrash(page); return;
    }

    if (isSectionRoute(state.currentRoute)) {
      renderSection(page, state.currentRoute);
      return;
    }

    navigate("dashboard");
  }

  /* =======================================================
     DASHBOARD  (profile is read-only here; edit it in Settings)
  ======================================================= */

  function renderDashboard(page) {
    const profile = state.profile;

    const pendingTasks = getSectionCategories("tasks").reduce(
      (total, c) => total + c.contents.filter(item => !item.done).length,
      0
    );

    page.innerHTML = `

      <div class="card profile-view">

        <div class="profile-banner"></div>

        <div class="profile-view-body">

          <div class="profile-photo-wrap">
            <div class="profile-photo">
              ${
                profile.photo
                  ? `<img src="${profile.photo}" alt="Profile photo">`
                  : escapeHtml(getInitials(profile.name))
              }
            </div>
          </div>

          <div class="profile-view-info">
            <h2>${escapeHtml(profile.name)}</h2>
            ${profile.role ? `<div class="profile-role">${escapeHtml(profile.role)}</div>` : ""}
            <div class="profile-meta">
              ${profile.email ? `<span>✉️ ${escapeHtml(profile.email)}</span>` : `<span>✉️ No email added</span>`}
            </div>
          </div>

          <button class="secondary-btn" data-route="settings">⚙️ Edit in Settings</button>

        </div>

        <div class="profile-about">
          <h3>About Me</h3>
          <p>${escapeHtml(profile.description || "Add a short description about yourself in Settings.")}</p>
        </div>

      </div>


      <div class="card dashboard-hero">

        <div class="hero-copy">

          <h1>Ignova Technologies</h1>

          <div class="tagline">Recruitment &amp; Technology Operations</div>

          <p>
            Ignova Technologies is the workspace for managing recruitment
            activities, job applications, recruiter coordination, training,
            candidate workflows and important work information in one place.
          </p>

          <div class="pills">
            <span class="pill">Recruitment</span>
            <span class="pill">HR Operations</span>
            <span class="pill">Job Applications</span>
            <span class="pill">Training</span>
            <span class="pill">Workflow Management</span>
          </div>

        </div>

        <div class="hero-img"></div>

      </div>


      <div class="section-title">
        <h2>Current Time</h2>
        <span>Live time zones</span>
      </div>

      <div class="clock-grid">
        ${clockCard("🇮🇳", "India", "IST", "india", "Asia/Kolkata")}
        ${clockCard("🇺🇸", "United States", "Central Time", "us", "America/Chicago")}
        ${clockCard("📍", "Illinois", "Central Time", "il", "America/Chicago")}
      </div>


      <div class="section-title">
        <h2>Workspace</h2>
        <span>Overview</span>
      </div>

      <div class="stat-grid">
        <div class="card stat-card"><strong>${state.data.categories.length}</strong><span>Categories</span></div>
        <div class="card stat-card"><strong>${getTotalContentCount()}</strong><span>Items saved</span></div>
        <div class="card stat-card"><strong>${pendingTasks}</strong><span>Tasks pending</span></div>
        <div class="card stat-card"><strong>${state.data.trash.length}</strong><span>In trash</span></div>
      </div>

    `;

    startClockUpdates();
  }

  function clockCard(flag, name, zone, className, timezone) {
    const now = new Date();

    return `
      <div class="clock-card ${className}">
        <div class="clock-top">
          <div class="flag">${flag}</div>
          <div>
            <h3>${name}</h3>
            <small>${zone}</small>
          </div>
        </div>
        <div class="clock-time" data-timezone="${timezone}">${formatTime(now, timezone)}</div>
        <div class="clock-date" data-date-timezone="${timezone}">${formatDate(now, timezone)}</div>
      </div>
    `;
  }

  function startClockUpdates() {
    if (clockInterval) clearInterval(clockInterval);
    updateClocks();
    clockInterval = setInterval(updateClocks, 1000);
  }

  function updateClocks() {
    document.querySelectorAll("[data-timezone]").forEach(el => {
      el.textContent = formatTime(new Date(), el.dataset.timezone);
    });

    document.querySelectorAll("[data-date-timezone]").forEach(el => {
      el.textContent = formatDate(new Date(), el.dataset.dateTimezone);
    });
  }

  function formatTime(date, timezone) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
    }).format(date);
  }

  function formatDate(date, timezone) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone, weekday: "long", year: "numeric", month: "long", day: "numeric"
    }).format(date);
  }

  /* =======================================================
     SECTION PAGE  (All Notes, Work, Tasks, ... all behave the same)
     Header button = "+ Add Category". Categories show as folder
     cards, 3 per row. Clicking a folder opens its content.
  ======================================================= */

  function renderSection(page, route) {
    // A folder is open -> show its content page
    if (state.openFolderId) {
      const folder = findCategory(state.openFolderId);

      if (folder && folder.section === route) {
        renderFolderPage(page, folder);
        return;
      }

      state.openFolderId = null;
    }

    const nav = getNavItem(route);

    const all = getSectionCategories(route);
    const categories = filteredCategories(all);

    let body;

    if (categories.length) {
      body = `<div class="folder-grid">${categories.map(c => renderFolderCard(c, route)).join("")}</div>`;
    } else if (state.search && all.length) {
      body = `
        <div class="empty-state">
          <div style="font-size:40px">🔍</div>
          <h3>No matches</h3>
          <p>Nothing in ${escapeHtml(nav.label)} matches your search.</p>
        </div>`;
    } else {
      body = `
        <div class="empty-state">
          <div style="font-size:40px">📂</div>
          <h3>No categories yet</h3>
          <p>Click "Add Category" to create your first folder in ${escapeHtml(nav.label)}.</p>
          <button class="primary-btn" data-action="add-category">+ Add Category</button>
        </div>`;
    }

    page.innerHTML = `

      <div class="page-head">
        <div>
          <h1>${escapeHtml(nav.icon)} ${escapeHtml(nav.label)}</h1>
          <p>${escapeHtml(nav.desc)}</p>
        </div>
        <button class="primary-btn" data-action="add-category">+ Add Category</button>
      </div>

      ${body}

    `;
  }

  function renderFolderCard(category, route) {
    const color = category.color || COLORS[0];
    const count = category.contents.length;

    let countLabel = `${count} item${count === 1 ? "" : "s"}`;

    if (route === "tasks") {
      const { done, total } = taskStats(category);
      countLabel = `${done}/${total} done`;
    }

    return `

      <article
        class="folder-card"
        style="${colorStyle(color)}"
        data-action="open-folder"
        data-category-id="${category.id}"
        tabindex="0"
        role="button"
        aria-label="Open ${escapeAttribute(category.name)}"
      >

        <div class="folder-top">

          <div class="folder-icon">${escapeHtml(category.icon || "📁")}</div>

          <div class="folder-actions">
            <button class="mini-btn" title="Edit Category" data-action="edit-category" data-category-id="${category.id}">✏️</button>
            <button class="mini-btn" title="Move Category to Trash" data-action="delete-category" data-category-id="${category.id}">🗑️</button>
          </div>

        </div>

        <h3>${escapeHtml(category.name)}</h3>
        <p>${escapeHtml(category.description || "No description")}</p>

        <div class="folder-foot">
          <span>${countLabel}</span>
          <span>Open ›</span>
        </div>

      </article>

    `;
  }

  /* =======================================================
     FOLDER PAGE  (content list - one item per row)
  ======================================================= */

  function renderFolderPage(page, category) {
    const nav = getNavItem(category.section);
    const contents = filterContents(category.contents);
    const isTasks = category.section === "tasks";

    let progress = "";

    if (isTasks) {
      const { done, total } = taskStats(category);
      progress = `<span class="task-progress">${done} of ${total} completed</span>`;
    }

    page.innerHTML = `

      <div class="page-head">

        <div>
          <button class="back-btn" data-action="close-folder">← Back to ${escapeHtml(nav ? nav.label : "categories")}</button>
          <h1>${escapeHtml(category.icon || "📁")} ${escapeHtml(category.name)}</h1>
          <p>
            ${escapeHtml(category.description || "")}
            ${category.description ? "•" : ""}
            ${category.contents.length} item(s)
            ${progress}
          </p>
        </div>

        <div style="display:flex;gap:8px;align-items:center">

          <button class="secondary-btn" data-action="edit-category" data-category-id="${category.id}">✏️ Edit</button>

          <div class="add-content primary">

            <button type="button" data-action="open-content-menu" data-category-id="${category.id}">
              + Add Content
            </button>

            <div class="content-menu app-hidden" data-content-menu="${category.id}">
              ${CONTENT_TYPES.map(t => contentMenuButton(category.id, t.type, t.icon, t.label)).join("")}
            </div>

          </div>

        </div>

      </div>

      ${
        contents.length
          ? `<div class="content-list">${contents.map(content => renderContentItem(category, content)).join("")}</div>`
          : `
            <div class="empty-state">
              <div style="font-size:40px">${state.search ? "🔍" : "🗒️"}</div>
              <h3>${state.search ? "No matches" : "Nothing here yet"}</h3>
              <p>${
                state.search
                  ? "No content in this category matches your search."
                  : `Click <strong>+ Add Content</strong> to add ${isTasks ? "your first task" : "a note, image, URL, document or voice note"}.`
              }</p>
            </div>
          `
      }

    `;
  }

  function contentMenuButton(categoryId, type, icon, label) {
    return `
      <button type="button" data-action="add-content" data-category-id="${categoryId}" data-content-type="${type}">
        <span>${icon}</span>
        ${label}
      </button>
    `;
  }

  /* =======================================================
     CONTENT ITEM
  ======================================================= */

  function renderContentItem(category, content) {
    const color = content.color || category.color || COLORS[0];
    const isTask = category.section === "tasks";

    let body = "";

    if (content.type === "text" || content.type === "article") {

      body = `<p>${escapeHtml(content.content || "")}</p>`;

    } else if (content.type === "image" || content.type === "screenshot") {

      body = `
        ${content.fileData ? `<img src="${content.fileData}" alt="${escapeAttribute(content.title)}">` : ""}
        ${content.content ? `<p>${escapeHtml(content.content)}</p>` : ""}
      `;

    } else if (content.type === "url") {

      body = `
        <a href="${escapeAttribute(normalizeUrl(content.url))}" target="_blank" rel="noopener noreferrer">
          ${escapeHtml(content.url)}
        </a>
        ${content.content ? `<p>${escapeHtml(content.content)}</p>` : ""}
      `;

    } else if (content.type === "file") {

      body = content.fileData
        ? `<a href="${content.fileData}" download="${escapeAttribute(content.fileName || content.title)}">
             📥 Download ${escapeHtml(content.fileName || "document")}
           </a>`
        : `<p>${escapeHtml(content.fileName || "Document")}</p>`;

    } else if (content.type === "voice") {

      body = content.fileData
        ? `<audio controls style="width:100%;margin-top:8px;" src="${content.fileData}"></audio>`
        : "";
    }

    return `

      <div class="content-item ${isTask && content.done ? "task-done" : ""}" style="${colorStyle(color)}">

        <div class="content-item-head">

          ${
            isTask
              ? `<input
                   type="checkbox"
                   class="task-checkbox"
                   title="Mark task as done"
                   aria-label="Mark ${escapeAttribute(content.title || "task")} as done"
                   data-task-toggle
                   data-category-id="${category.id}"
                   data-content-id="${content.id}"
                   ${content.done ? "checked" : ""}
                 >`
              : ""
          }

          <div class="content-icon">${getContentIcon(content.type)}</div>

          <div class="content-main">

            <h4>${escapeHtml(content.title || "Untitled")}</h4>

            ${body}

            <div class="content-meta">
              ${escapeHtml(content.type)} • ${formatTimestamp(content.updatedAt || content.createdAt)}
            </div>

          </div>

          <div class="content-actions">

            <button class="mini-btn" title="Copy Content" data-action="copy-content"
              data-category-id="${category.id}" data-content-id="${content.id}">📋</button>

            <button class="mini-btn" title="Edit Content" data-action="edit-content"
              data-category-id="${category.id}" data-content-id="${content.id}">✎</button>

            <button class="mini-btn" title="Move to Trash" data-action="delete-content"
              data-category-id="${category.id}" data-content-id="${content.id}">🗑️</button>

          </div>

        </div>

      </div>

    `;
  }

  function getContentIcon(type) {
    const icons = {
      text: "📝", article: "📄", image: "🖼️", screenshot: "📸",
      url: "🔗", file: "📁", voice: "🎙️"
    };

    return icons[type] || "📌";
  }

  /* =======================================================
     TASK CHECKBOX
  ======================================================= */

  function toggleTask(categoryId, contentId, checked) {
    const category = findCategory(categoryId);

    if (!category) return;

    const item = category.contents.find(c => c.id === contentId);

    if (!item) return;

    item.done = Boolean(checked);

    saveData();
    render();
  }

  /* =======================================================
     CATEGORY MODAL
  ======================================================= */

  function openCategoryModal(categoryId = null) {
    const category = categoryId ? findCategory(categoryId) : null;
    const editing = Boolean(category);

    const nav = getNavItem(state.currentRoute);

    showModal(`

      <h2>${editing ? "Edit Category" : "Create Category"}</h2>

      <p class="sub">
        ${
          editing
            ? "Update your category details."
            : `This category will be created in <strong>${escapeHtml(nav ? nav.label : "All Notes")}</strong>.`
        }
      </p>

      <div class="form-grid">

        <div class="field">
          <label>Category Name</label>
          <input id="categoryName" type="text" value="${escapeAttribute(category?.name || "")}" placeholder="Example: Projects" autofocus>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea id="categoryDescription" placeholder="What will you store here?">${escapeHtml(category?.description || "")}</textarea>
        </div>

        <div class="field">
          <label>Icon</label>
          <input id="categoryIcon" type="text" maxlength="4" value="${escapeAttribute(category?.icon || "📁")}" placeholder="📁">
        </div>

      </div>

      <div class="modal-actions">
        <button class="secondary-btn" data-action="cancel-modal">Cancel</button>
        <button class="primary-btn" id="createCategoryButton">
          ${editing ? "Update Category" : "Create Category"}
        </button>
      </div>

    `);

    const button = document.getElementById("createCategoryButton");
    if (button) button.addEventListener("click", () => saveCategory(categoryId));

    const nameInput = document.getElementById("categoryName");
    if (nameInput) nameInput.focus();
  }

  function saveCategory(categoryId) {
    const name = document.getElementById("categoryName")?.value.trim();
    const description = document.getElementById("categoryDescription")?.value.trim();
    const icon = document.getElementById("categoryIcon")?.value.trim() || "📁";

    if (!name) {
      showToast("Please enter a category name.", "error");
      return;
    }

    if (categoryId) {
      const category = findCategory(categoryId);

      if (!category) {
        showToast("Category no longer exists.", "error");
        closeModal();
        return;
      }

      category.name = name;
      category.description = description;
      category.icon = icon;
      category.updatedAt = new Date().toISOString();

      saveData();
      closeModal();
      renderSidebar();
      render();
      showToast("Category updated.", "success");
      return;
    }

    const now = new Date().toISOString();

    state.data.categories.push({
      id: uid("category"),
      name,
      description,
      icon,
      section: isSectionRoute(state.currentRoute) ? state.currentRoute : "all-notes",
      color: randomColor(),
      contents: [],
      createdAt: now,
      updatedAt: now
    });

    saveData();
    closeModal();
    renderSidebar();
    render();
    showToast("Category created successfully.", "success");
  }

  /* =======================================================
     CONTENT MODAL
  ======================================================= */

  function openContentModal(categoryId, contentType = null, contentId = null) {
    const category = findCategory(categoryId);

    if (!category) {
      showToast("Category no longer exists.", "error");
      return;
    }

    const existing = contentId ? category.contents.find(c => c.id === contentId) : null;

    if (contentId && !existing) {
      showToast("Content no longer exists.", "error");
      return;
    }

    if (!contentType && existing) contentType = existing.type;

    if (!contentType) {
      toggleContentMenuById(categoryId);
      return;
    }

    const editing = Boolean(existing);
    const isTask = category.section === "tasks";

    const typeLabels = {};
    CONTENT_TYPES.forEach(t => { typeLabels[t.type] = t.label; });

    let specialInput = "";

    if (contentType === "image" || contentType === "screenshot") {

      specialInput = `
        <div class="field">
          <label>Image Upload</label>
          <div class="upload-box">
            🖼️<br>
            <strong>Select Image</strong><br>
            <small>PNG, JPG, JPEG, WEBP</small><br>
            <input id="contentFileInput" type="file" accept="image/*">
          </div>
          <div id="filePreview" class="file-preview"></div>
        </div>
      `;

    } else if (contentType === "file") {

      specialInput = `
        <div class="field">
          <label>Document Upload</label>
          <div class="upload-box">
            📁<br>
            <strong>Upload Document File</strong><br>
            <small>PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT and other files</small><br>
            <input id="contentFileInput" type="file">
          </div>
          <div id="filePreview" class="file-preview"></div>
        </div>
      `;

    } else if (contentType === "voice") {

      specialInput = `
        <div class="field">
          <label>Voice Recording File</label>
          <div class="upload-box">
            🎙️<br>
            <strong>Upload Voice Note</strong><br>
            <input id="contentFileInput" type="file" accept="audio/*">
          </div>
          <div id="filePreview" class="file-preview"></div>
        </div>
      `;

    } else if (contentType === "url") {

      specialInput = `
        <div class="field">
          <label>URL / Link</label>
          <input id="contentUrl" type="url" value="${escapeAttribute(existing?.url || "")}" placeholder="https://example.com">
        </div>
      `;
    }

    showModal(`

      <h2>${editing ? "Edit Content" : "Add " + (isTask ? "Task - " : "") + typeLabels[contentType]}</h2>

      <p class="sub">Category: <strong>${escapeHtml(category.name)}</strong></p>

      <div class="form-grid">

        <div class="field">
          <label>${isTask ? "Task title" : "Title"}</label>
          <input id="contentTitle" type="text" value="${escapeAttribute(existing?.title || "")}" placeholder="${isTask ? "What needs to be done?" : "Enter title"}" autofocus>
        </div>

        ${
          contentType === "text" || contentType === "article"
            ? `<div class="field">
                 <label>Content</label>
                 <textarea id="contentBody" placeholder="Write your content here...">${escapeHtml(existing?.content || "")}</textarea>
               </div>`
            : ""
        }

        ${
          contentType === "url"
            ? `<div class="field">
                 <label>Description</label>
                 <textarea id="contentBody" placeholder="Optional description...">${escapeHtml(existing?.content || "")}</textarea>
               </div>`
            : ""
        }

        ${specialInput}

      </div>

      <div class="modal-actions">
        <button class="secondary-btn" data-action="cancel-modal">Cancel</button>
        <button class="primary-btn" id="addContentButton">
          ${editing ? "Update Content" : "Add Content"}
        </button>
      </div>

    `);

    const addButton = document.getElementById("addContentButton");

    if (addButton) {
      addButton.addEventListener("click", async () => {
        await saveContent(categoryId, contentType, contentId);
      });
    }

    const titleInput = document.getElementById("contentTitle");
    if (titleInput) titleInput.focus();
  }

  async function saveContent(categoryId, contentType, contentId) {
    const category = findCategory(categoryId);

    if (!category) {
      showToast("Category no longer exists.", "error");
      closeModal();
      return;
    }

    const title = document.getElementById("contentTitle")?.value.trim();
    const content = document.getElementById("contentBody")?.value.trim() || "";
    const url = document.getElementById("contentUrl")?.value.trim() || "";

    if (!title) {
      showToast("Please enter a title.", "error");
      return;
    }

    if ((contentType === "text" || contentType === "article") && !content) {
      showToast("Please enter the note content.", "error");
      return;
    }

    if (contentType === "url" && !url) {
      showToast("Please enter a URL.", "error");
      return;
    }

    const fileInput = document.getElementById("contentFileInput");

    let fileData = null;
    let fileName = "";
    let mimeType = "";

    if (["image", "screenshot", "file", "voice"].includes(contentType)) {

      if (fileInput && fileInput.files && fileInput.files.length > 0) {

        const file = fileInput.files[0];

        fileName = file.name;
        mimeType = file.type;

        try {
          fileData = await readFileAsDataURL(file);
        } catch (error) {
          console.error(error);
          showToast("Unable to read the selected file.", "error");
          return;
        }

      } else if (contentId) {

        const existing = category.contents.find(c => c.id === contentId);

        fileData = existing?.fileData || null;
        fileName = existing?.fileName || "";
        mimeType = existing?.mimeType || "";

      } else {

        showToast("Please select a file.", "error");
        return;
      }
    }

    if (contentId) {
      const item = category.contents.find(c => c.id === contentId);

      if (!item) {
        showToast("Content no longer exists.", "error");
        closeModal();
        return;
      }

      item.title = title;
      item.content = content;
      item.url = url;

      if (fileData) {
        item.fileData = fileData;
        item.fileName = fileName;
        item.mimeType = mimeType;
      }

      item.updatedAt = new Date().toISOString();

      saveData();
      closeModal();
      renderSidebar();
      render();
      showToast("Content updated successfully.", "success");
      return;
    }

    const now = new Date().toISOString();

    category.contents.push({
      id: uid("content"),
      type: contentType,
      title,
      content,
      url,
      fileData,
      fileName,
      mimeType,
      done: false,
      color: randomColor(),
      createdAt: now,
      updatedAt: now
    });

    category.updatedAt = now;

    saveData();
    closeModal();
    renderSidebar();
    render();
    showToast("Content added successfully.", "success");
  }

  /* =======================================================
     FILE HELPERS
  ======================================================= */

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  /* Shrinks a profile photo so it stays small in localStorage */
  function resizeImage(dataUrl, maxSize = 400) {
    return new Promise(resolve => {
      const img = new Image();

      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };

      img.onerror = () => resolve(dataUrl);

      img.src = dataUrl;
    });
  }

  function showSelectedFile(input) {
    const preview = document.getElementById("filePreview");

    if (!preview) return;

    if (!input.files || !input.files.length) {
      preview.textContent = "";
      return;
    }

    const file = input.files[0];

    preview.innerHTML = `
      <strong>Selected:</strong> ${escapeHtml(file.name)}
      <br><small>${formatBytes(file.size)}</small>
    `;
  }

  /* =======================================================
     PROFILE PHOTO (Settings)
  ======================================================= */

  async function previewProfilePhoto(input) {
    if (!input.files || !input.files.length) return;

    try {
      const raw = await readFileAsDataURL(input.files[0]);
      const dataUrl = await resizeImage(raw);

      pendingProfilePhoto = dataUrl;

      const photoEl = document.getElementById("settingsProfilePhoto");

      if (photoEl) photoEl.innerHTML = `<img src="${dataUrl}" alt="Profile photo">`;

    } catch (error) {
      console.error(error);
      showToast("Unable to read the selected image.", "error");
    }
  }

  function removeProfilePhoto() {
    pendingProfilePhoto = null;

    const photoEl = document.getElementById("settingsProfilePhoto");
    const nameInput = document.getElementById("profileName");

    if (photoEl) {
      photoEl.textContent = getInitials(nameInput ? nameInput.value : state.profile.name);
    }

    const fileInput = document.getElementById("profilePhotoInput");
    if (fileInput) fileInput.value = "";

    showToast("Photo removed. Click Save Profile to apply.", "success");
  }

  /* =======================================================
     TRASH
  ======================================================= */

  function moveCategoryToTrash(categoryId) {
    const index = state.data.categories.findIndex(c => c.id === categoryId);

    if (index === -1) {
      showToast("Category not found.", "error");
      return;
    }

    const category = state.data.categories[index];

    state.data.trash.push({
      id: uid("trash"),
      originalType: "category",
      originalData: JSON.parse(JSON.stringify(category)),
      deletedAt: new Date().toISOString()
    });

    state.data.categories.splice(index, 1);

    if (state.openFolderId === categoryId) state.openFolderId = null;

    saveData();
    renderSidebar();
    render();
    showToast("Category moved to Trash.", "success");
  }

  function copyContentToClipboard(categoryId, contentId) {
    const category = findCategory(categoryId);

    if (!category) {
      showToast("Category not found.", "error");
      return;
    }

    const content = category.contents.find(c => c.id === contentId);

    if (!content) {
      showToast("Content not found.", "error");
      return;
    }

    let textToCopy = "";

    if (content.title) textToCopy += content.title + "\n\n";

    if (content.type === "url") {
      if (content.url) textToCopy += content.url + "\n\n";
      if (content.content) textToCopy += content.content;
    } else if (content.type === "file") {
      textToCopy += content.fileName || "Document";
      if (content.content) textToCopy += "\n\n" + content.content;
    } else if (content.content) {
      textToCopy += content.content;
    }

    textToCopy = textToCopy.trim();

    if (!textToCopy) {
      showToast("There is no text to copy.", "error");
      return;
    }

    navigator.clipboard
      .writeText(textToCopy)
      .then(() => showToast("Content copied to clipboard.", "success"))
      .catch(error => {
        console.error("Clipboard error:", error);
        showToast("Unable to copy content.", "error");
      });
  }

  function moveContentToTrash(categoryId, contentId) {
    const category = findCategory(categoryId);

    if (!category) {
      showToast("Category not found.", "error");
      return;
    }

    const index = category.contents.findIndex(c => c.id === contentId);

    if (index === -1) {
      showToast("Content not found.", "error");
      return;
    }

    state.data.trash.push({
      id: uid("trash"),
      originalType: "content",
      categoryId,
      categoryName: category.name,
      section: category.section,
      originalData: JSON.parse(JSON.stringify(category.contents[index])),
      deletedAt: new Date().toISOString()
    });

    category.contents.splice(index, 1);

    saveData();
    renderSidebar();
    render();
    showToast("Content moved to Trash.", "success");
  }

  function renderTrash(page) {
    page.innerHTML = `

      <div class="page-head">
        <div>
          <h1>Trash</h1>
          <p>Deleted categories and content.</p>
        </div>
        ${
          state.data.trash.length
            ? `<button class="danger-btn" data-action="empty-trash">🗑️ Empty Trash</button>`
            : ""
        }
      </div>

      <div class="card">
        ${
          state.data.trash.length
            ? state.data.trash.map(renderTrashItem).join("")
            : `
              <div class="empty-state">
                <div style="font-size:40px">🗑️</div>
                <h3>Trash is empty</h3>
                <p>Deleted items will appear here.</p>
              </div>
            `
        }
      </div>

    `;
  }

  function renderTrashItem(item) {
    const isCategory = item.originalType === "category";

    const title = isCategory ? item.originalData.name : item.originalData.title;
    const type = isCategory ? "Category" : item.originalData.type;

    const sectionId = isCategory ? item.originalData.section : item.section;
    const sectionNav = getNavItem(sectionId);

    return `

      <div class="trash-item">

        <div style="width:40px;height:40px;border-radius:10px;background:#fff0f4;display:grid;place-items:center;">
          ${isCategory ? "📁" : getContentIcon(type)}
        </div>

        <div class="trash-main">
          <strong>${escapeHtml(title || "Untitled")}</strong>
          <small>
            ${escapeHtml(type)}
            • Deleted ${formatTimestamp(item.deletedAt)}
            ${!isCategory && item.categoryName ? ` • ${escapeHtml(item.categoryName)}` : ""}
            ${sectionNav ? ` • ${escapeHtml(sectionNav.label)}` : ""}
          </small>
        </div>

        <div class="trash-actions">
          <button class="secondary-btn" data-action="restore-trash" data-trash-id="${item.id}">♻️ Restore</button>
          <button class="danger-btn" data-action="permanent-delete" data-trash-id="${item.id}">🗑️ Delete</button>
        </div>

      </div>

    `;
  }

  function restoreTrashItem(trashId) {
    const index = state.data.trash.findIndex(item => item.id === trashId);

    if (index === -1) {
      showToast("Trash item not found.", "error");
      return;
    }

    const item = state.data.trash[index];

    if (item.originalType === "category") {

      const restored = migrateCategory(item.originalData) || item.originalData;
      state.data.categories.push(restored);

    } else {

      const category = findCategory(item.categoryId);

      if (category) {

        category.contents.push(item.originalData);

      } else {

        const now = new Date().toISOString();

        state.data.categories.push({
          id: uid("category"),
          name: item.categoryName || "Recovered Notes",
          description: "Recovered from Trash",
          icon: "♻️",
          section: item.section || "all-notes",
          color: randomColor(),
          contents: [item.originalData],
          createdAt: now,
          updatedAt: now
        });
      }
    }

    state.data.trash.splice(index, 1);

    saveData();
    renderSidebar();
    render();
    showToast("Item restored successfully.", "success");
  }

  function permanentlyDeleteTrashItem(trashId) {
    const index = state.data.trash.findIndex(item => item.id === trashId);

    if (index === -1) return;

    if (!window.confirm("Permanently delete this item?")) return;

    state.data.trash.splice(index, 1);

    saveData();
    renderSidebar();
    render();
    showToast("Item permanently deleted.", "success");
  }

  function emptyTrash() {
    if (!state.data.trash.length) return;

    if (!window.confirm("Permanently delete everything in Trash?")) return;

    state.data.trash = [];

    saveData();
    renderSidebar();
    render();
    showToast("Trash cleaned successfully.", "success");
  }

  /* =======================================================
     SETTINGS  (the only place the profile can be edited)
  ======================================================= */

  function renderSettings(page) {
    const p = state.profile;

    page.innerHTML = `

      <div class="page-head">
        <div>
          <h1>Settings</h1>
          <p>Edit your profile details. They are shown on the Dashboard.</p>
        </div>
      </div>

      <div class="settings-grid">

        <div class="card settings-card">

          <h3>Profile</h3>

          <div class="settings-photo-row">

            <div class="profile-photo-wrap">
              <div class="profile-photo" id="settingsProfilePhoto">
                ${p.photo ? `<img src="${p.photo}" alt="Profile photo">` : escapeHtml(getInitials(p.name))}
              </div>
              <label class="photo-edit-btn" for="profilePhotoInput" title="Change photo">✎</label>
              <input id="profilePhotoInput" type="file" accept="image/*" style="display:none">
            </div>

            <div>
              <strong>Profile photo</strong>
              <p>Click the pencil to upload a new photo.</p>
              <button class="secondary-btn" type="button" data-action="remove-profile-photo">Remove photo</button>
            </div>

          </div>

          <div class="form-grid">

            <div class="field">
              <label>Name</label>
              <input id="profileName" value="${escapeAttribute(p.name)}" placeholder="Your name">
            </div>

            <div class="field">
              <label>Role</label>
              <input id="profileRole" value="${escapeAttribute(p.role)}" placeholder="Your role">
            </div>

            <div class="field">
              <label>Email</label>
              <input id="profileEmail" type="email" value="${escapeAttribute(p.email)}" placeholder="Email">
            </div>

            <div class="field">
              <label>About Me</label>
              <textarea id="profileDescription" placeholder="A short description about you...">${escapeHtml(p.description)}</textarea>
            </div>

            <div class="settings-actions">
              <button class="primary-btn" data-action="save-profile">Save Profile</button>
            </div>

          </div>

        </div>

        <div class="card settings-card">

          <h3>Data</h3>

          <p>Categories: <strong>${state.data.categories.length}</strong></p>
          <p>Total contents: <strong>${getTotalContentCount()}</strong></p>
          <p>Trash: <strong>${state.data.trash.length}</strong></p>

        </div>

      </div>

    `;
  }

  function saveProfileFromForm() {
    const name = document.getElementById("profileName")?.value.trim();
    const email = document.getElementById("profileEmail")?.value.trim();
    const role = document.getElementById("profileRole")?.value.trim();
    const description = document.getElementById("profileDescription")?.value.trim();

    if (!name) {
      showToast("Name is required.", "error");
      return;
    }

    const photo = pendingProfilePhoto !== undefined ? pendingProfilePhoto : state.profile.photo;

    state.profile = { name, email, role, description, photo: photo || null };

    pendingProfilePhoto = undefined;

    if (!saveProfile()) return;

    updateAvatar();
    render();
    showToast("Profile saved.", "success");
  }

  /* =======================================================
     CONTENT MENU
  ======================================================= */

  function toggleContentMenuById(categoryId) {
    document.querySelectorAll(".content-menu").forEach(menu => {
      if (menu.dataset.contentMenu === categoryId) {
        menu.classList.toggle("app-hidden");
      } else {
        menu.classList.add("app-hidden");
      }
    });
  }

  function hideContentMenus() {
    document.querySelectorAll(".content-menu").forEach(menu => menu.classList.add("app-hidden"));
  }

  /* =======================================================
     MODAL
  ======================================================= */

  function showModal(content) {
    const root = document.getElementById("modalRoot");

    if (!root) return;

    root.innerHTML = `
      <div class="modal-backdrop" id="activeModal">
        <div class="modal" role="dialog" aria-modal="true">
          ${content}
        </div>
      </div>
    `;

    const backdrop = document.getElementById("activeModal");

    if (backdrop) {
      backdrop.addEventListener("click", event => {
        if (event.target === backdrop) closeModal();
      });
    }
  }

  function closeModal() {
    const root = document.getElementById("modalRoot");
    if (root) root.innerHTML = "";
  }

  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(message, type = "success") {
    const root = document.getElementById("toastRoot");

    if (!root) return;

    const toast = document.createElement("div");

    toast.className = "toast " + type;
    toast.textContent = message;

    root.appendChild(toast);

    setTimeout(() => toast.remove(), 2800);
  }

  /* =======================================================
     SIDEBAR OPEN / CLOSE
  ======================================================= */

  function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");

    if (!sidebar) return;

    if (window.innerWidth <= 760) {
      sidebar.classList.toggle("open");
    } else {
      sidebar.classList.toggle("closed");
    }
  }

  /* =======================================================
     THEME
  ======================================================= */

  function loadTheme() {
    if (localStorage.getItem(THEME_KEY) === "dark") {
      document.body.classList.add("dark");
    }
  }

  function toggleTheme() {
    document.body.classList.toggle("dark");

    localStorage.setItem(
      THEME_KEY,
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  }

  /* =======================================================
     SEARCH
  ======================================================= */

  function filteredCategories(categories) {
    if (!state.search) return categories;

    return categories.filter(category => {
      const categoryMatches = ((category.name || "") + " " + (category.description || ""))
        .toLowerCase()
        .includes(state.search);

      return categoryMatches || filterContents(category.contents).length > 0;
    });
  }

  function filterContents(contents) {
    if (!state.search) return contents || [];

    return (contents || []).filter(content => {
      const searchable = [content.title, content.content, content.url, content.fileName, content.type]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(state.search);
    });
  }

  /* =======================================================
     UTILITIES
  ======================================================= */

  function normalizeUrl(url) {
    if (/^https?:\/\//i.test(url)) return url;
    return "https://" + url;
  }

  function formatTimestamp(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB"];
    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + " " + units[index];
  }

  function getInitials(name) {
    return String(name || "V")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join("");
  }

  function getTotalContentCount() {
    return state.data.categories.reduce(
      (total, category) => total + (Array.isArray(category.contents) ? category.contents.length : 0),
      0
    );
  }

  function updateAvatar() {
    const avatar = document.getElementById("topAvatar");

    if (!avatar) return;

    if (state.profile.photo) {
      avatar.innerHTML = `<img src="${state.profile.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatar.textContent = getInitials(state.profile.name);
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value);
  }

})();
