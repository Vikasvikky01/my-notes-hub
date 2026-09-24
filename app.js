/* =========================================================
   MY NOTES HUB
   Complete Notes / Categories / Trash Application
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

  /* =======================================================
     LIGHT COLOR THEMES (used for category / content cards)
  ======================================================= */

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
     Each of these (besides dashboard / all-notes / trash) is
     backed by a real category that is auto-created the first
     time it's needed, so every nav item behaves exactly like
     a user-made category: Add Content menu, all content
     types, edit / copy / trash on each item, etc.
  ======================================================= */

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: "🏠", color: "#6C63FF" },
    { id: "all-notes", label: "All Notes", icon: "📝", color: "#4C8DFF" },
    { id: "work", label: "Work", icon: "💼", color: "#3AB795" },
    { id: "personal", label: "Personal", icon: "👤", color: "#46B4B0" },
    { id: "ideas", label: "Ideas", icon: "💡", color: "#F5A623" },
    { id: "important", label: "Important", icon: "⭐", color: "#EF5DA8" },
    { id: "tasks", label: "Tasks", icon: "✅", color: "#5C9DED" },
    { id: "links", label: "Links", icon: "🔗", color: "#8E5CF7" },
    { id: "documents", label: "Documents", icon: "📄", color: "#E0764A" },
    { id: "screenshots", label: "Screenshots", icon: "📸", color: "#4FA6E0" },
    { id: "contacts", label: "Contacts", icon: "👥", color: "#C2554E" },
    { id: "travel", label: "Travel", icon: "✈️", color: "#35A7A0" },
    { id: "finance", label: "Finance", icon: "💰", color: "#C98A2E" },
    { id: "health", label: "Health", icon: "❤️", color: "#E14F63" },
    { id: "learning", label: "Learning", icon: "📚", color: "#6E56CF" },
    { id: "trash", label: "Trash", icon: "🗑️", color: "#B23B5E" }
  ];

  // Nav ids that are NOT backed by a real category
  const NON_CATEGORY_ROUTES = new Set(["dashboard", "all-notes", "settings", "trash"]);

  /* =======================================================
     APPLICATION STATE
  ======================================================= */

  let state = {
    currentRoute: "dashboard",
    search: "",
    data: loadData(),
    profile: loadProfile(),
    driveConnected: false
  };

  // Holds a freshly-picked profile photo (data URL) until "Save Profile" is clicked
  let pendingProfilePhoto = null;

  /* =======================================================
     INITIALIZE
  ======================================================= */

  document.addEventListener("DOMContentLoaded", init);

  function init() {

    loadTheme();

    ensureAllSystemCategories();

    renderSidebar();

    bindGlobalEvents();

    render();

    updateAvatar();

  }

  /* =======================================================
     STORAGE
  ======================================================= */

  function loadData() {

    try {

      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return { categories: [], trash: [] };
      }

      const parsed = JSON.parse(saved);

      return {
        categories: Array.isArray(parsed.categories) ? parsed.categories : [],
        trash: Array.isArray(parsed.trash) ? parsed.trash : []
      };

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

      return saved
        ? { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
        : { ...DEFAULT_PROFILE };

    } catch {

      return { ...DEFAULT_PROFILE };

    }

  }

  function saveProfile() {

    localStorage.setItem(PROFILE_KEY, JSON.stringify(state.profile));

  }

  /* =======================================================
     ID GENERATOR
  ======================================================= */

  function uid(prefix = "id") {

    return (
      prefix + "_" + Date.now().toString(36) + "_" +
      Math.random().toString(36).substring(2, 10)
    );

  }

  /* =======================================================
     RANDOM LIGHT COLOR (for category / content card tints)
  ======================================================= */

  function randomColor() {

    return COLORS[Math.floor(Math.random() * COLORS.length)];

  }

  function colorStyle(color) {

    const c = color || randomColor();

    return `
      --theme-bg:${c.bg};
      --theme-soft:${c.soft};
      --theme-icon-bg:${c.icon};
      --theme-border:${c.border};
      --theme-accent:${c.accent};
    `;

  }

  /* =======================================================
     SYSTEM CATEGORIES
     Every sidebar nav item (besides dashboard / all-notes /
     trash) is guaranteed to have a matching category so it
     has the exact same features as a user-created category.
  ======================================================= */

  function ensureSystemCategory(routeId) {

    const navItem = NAV_ITEMS.find(n => n.id === routeId);

    if (!navItem || NON_CATEGORY_ROUTES.has(routeId)) return null;

    let category = state.data.categories.find(
      c => c.systemRoute === routeId
    );

    if (!category) {

      category = {
        id: uid("category"),
        name: navItem.label,
        description: "",
        icon: navItem.icon,
        systemRoute: routeId,
        color: randomColor(),
        contents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      state.data.categories.push(category);

      saveData();

    }

    return category;

  }

  function ensureAllSystemCategories() {

    NAV_ITEMS.forEach(item => {

      if (!NON_CATEGORY_ROUTES.has(item.id)) {

        ensureSystemCategory(item.id);

      }

    });

  }

  /* =======================================================
     SIDEBAR
  ======================================================= */

  function renderSidebar() {

    const nav = document.getElementById("sidebarNav");

    if (!nav) return;

    nav.innerHTML = "";

    NAV_ITEMS.forEach(item => {

      const count =
        item.id === "trash"
          ? state.data.trash.length
          : getRouteCount(item.id);

      const button = document.createElement("button");

      button.type = "button";

      button.className =
        "nav-item" + (state.currentRoute === item.id ? " active" : "");

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

  }

  function getRouteCount(route) {

    if (route === "all-notes") {

      return state.data.categories
        .filter(c => !c.systemRoute)
        .reduce((total, category) => total + category.contents.length, 0);

    }

    const category = state.data.categories.find(
      c => c.systemRoute === route || normalize(c.name) === normalize(route)
    );

    if (!category) return 0;

    return category.contents.length;

  }

  /* =======================================================
     GLOBAL EVENTS
  ======================================================= */

  function bindGlobalEvents() {

    document.addEventListener("click", handleClick);

    document.addEventListener("change", handleChange);

    document.addEventListener("input", handleInput);

    const search = document.getElementById("globalSearch");

    if (search) {

      search.addEventListener("input", event => {

        state.search = event.target.value.trim().toLowerCase();

        render();

      });

    }

    const themeBtn = document.getElementById("themeBtn");

    if (themeBtn) {

      themeBtn.addEventListener("click", toggleTheme);

    }

    const sidebarToggle = document.getElementById("sidebarToggle");

    if (sidebarToggle) {

      sidebarToggle.addEventListener("click", toggleSidebar);

    }

    const mobileMenu = document.getElementById("mobileMenu");

    if (mobileMenu) {

      mobileMenu.addEventListener("click", toggleSidebar);

    }

  }

  function handleClick(event) {

    const target = event.target.closest("button");

    if (!target) return;

    const route = target.dataset.route;

    if (route) {

      navigate(route);

      return;

    }

    const action = target.dataset.action;

    if (!action) return;

    switch (action) {

      case "add-category":
        openCategoryModal();
        break;

      case "open-content-menu":
        toggleContentMenu(target);
        break;

      case "add-content":
        openContentModal(
          target.dataset.categoryId,
          target.dataset.contentType
        );
        break;

      case "copy-content":
        copyContentToClipboard(
          target.dataset.categoryId,
          target.dataset.contentId
        );
        break;

      case "edit-category":
        openCategoryModal(target.dataset.categoryId);
        break;

      case "delete-category":
        moveCategoryToTrash(target.dataset.categoryId);
        break;

      case "edit-content":
        openContentModal(
          target.dataset.categoryId,
          null,
          target.dataset.contentId
        );
        break;

      case "delete-content":
        moveContentToTrash(
          target.dataset.categoryId,
          target.dataset.contentId
        );
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

      case "close-modal":
        closeModal();
        break;

      case "cancel-modal":
        closeModal();
        break;

    }

  }

  function handleChange(event) {

    if (event.target && event.target.id === "contentFileInput") {

      showSelectedFile(event.target);

    }

    if (event.target && event.target.id === "profilePhotoInput") {

      previewProfilePhoto(event.target);

    }

  }

  function handleInput(event) {

    if (event.target && event.target.id === "contentSearch") {

      const value = event.target.value.toLowerCase();

      document.querySelectorAll(".content-item").forEach(item => {

        item.style.display =
          item.innerText.toLowerCase().includes(value) ? "" : "none";

      });

    }

  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function navigate(route) {

    state.currentRoute = route;

    const sidebar = document.getElementById("sidebar");

    if (sidebar) {

      sidebar.classList.remove("open");

    }

    renderSidebar();

    render();

  }

  /* =======================================================
     MAIN RENDER
  ======================================================= */

  function render() {

    const page = document.getElementById("page");

    if (!page) return;

    if (state.currentRoute === "dashboard") {
      renderDashboard(page);
      return;
    }

    if (state.currentRoute === "settings") {
      renderSettings(page);
      return;
    }

    if (state.currentRoute === "trash") {
      renderTrash(page);
      return;
    }

    if (state.currentRoute === "all-notes") {
      renderAllNotes(page);
      return;
    }

    renderCategoryPage(page, state.currentRoute);

  }

  /* =======================================================
     DASHBOARD  (profile is fully editable here)
  ======================================================= */

  function renderDashboard(page) {

    const profile = state.profile;

    page.innerHTML = `

      <div class="dashboard-profile-top card">

        <div class="profile-card" style="margin:0;box-shadow:none;border:0">

          <div class="profile-photo-wrap">

            <div class="profile-photo" id="dashProfilePhoto"
              style="
                background:linear-gradient(145deg,#6a4bea,#8a70ff);
                display:grid;place-items:center;color:white;
                font-size:38px;font-weight:800;
              "
            >
              ${
                profile.photo
                  ? `<img src="${profile.photo}" alt="Profile photo">`
                  : escapeHtml(getInitials(profile.name))
              }
            </div>

            <label class="photo-edit-btn" for="profilePhotoInput" title="Change photo">
              ✎
            </label>

            <input
              id="profilePhotoInput"
              type="file"
              accept="image/*"
              style="display:none"
            >

          </div>

          <div class="profile-edit-fields">

            <div class="field">
              <label>Name</label>
              <input id="profileName" value="${escapeAttribute(profile.name)}" placeholder="Your name">
            </div>

            <div class="field">
              <label>Role</label>
              <input id="profileRole" value="${escapeAttribute(profile.role)}" placeholder="Your role">
            </div>

            <div class="field">
              <label>Email</label>
              <input id="profileEmail" type="email" value="${escapeAttribute(profile.email)}" placeholder="Email">
            </div>

          </div>

          <div class="responsibilities">

            <h3>About Me</h3>

            <textarea id="profileDescription" placeholder="A short description about you...">${escapeHtml(profile.description)}</textarea>

            <button class="primary-btn" data-action="save-profile" style="margin-top:10px">
              Save Profile
            </button>

          </div>

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
        <span>${state.data.categories.length} categories</span>
      </div>

      <div class="card dashboard-empty">
        <button class="primary-btn" data-action="add-category">+ Add Category</button>
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

  let clockInterval = null;

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
     ALL NOTES
  ======================================================= */

  function renderAllNotes(page) {

    const userCategories = state.data.categories.filter(
      c => !c.systemRoute
    );

    const categories = filteredCategories(userCategories);

    page.innerHTML = `

      <div class="page-head">
        <div>
          <h1>All Notes</h1>
          <p>Create your own categories and store different types of information.</p>
        </div>
        <button class="primary-btn" data-action="add-category">+ Add Category</button>
      </div>

      <div class="category-list">
        ${
          categories.length
            ? categories.map(renderCategoryCard).join("")
            : `
              <div class="empty-state">
                <div style="font-size:40px">📂</div>
                <h3>No categories yet</h3>
                <p>Click "Add Category" to create your first folder.</p>
                <button class="primary-btn" data-action="add-category">+ Add Category</button>
              </div>
            `
        }
      </div>

    `;

  }

  /* =======================================================
     CATEGORY PAGE (used by every sidebar nav item)
  ======================================================= */

  function renderCategoryPage(page, route) {

    // Auto-create the category behind this nav item if needed
    ensureSystemCategory(route);

    const category = findCategoryByRoute(route);

    if (!category) {

      page.innerHTML = `
        <div class="empty-state">
          <h2>Category not found</h2>
          <button class="primary-btn" data-route="all-notes">Back to All Notes</button>
        </div>
      `;

      return;

    }

    page.innerHTML = `

      <div class="page-head">
        <div>
          <h1>${escapeHtml(category.name)}</h1>
          <p>${escapeHtml(category.description || "")}</p>
        </div>
        <div style="display:flex;gap:8px">
          <button class="secondary-btn" data-action="edit-category" data-category-id="${category.id}">
            ✏️ Edit
          </button>
          <button class="primary-btn" data-action="open-content-menu" data-category-id="${category.id}">
            + Add Content
          </button>
        </div>
      </div>

      <div class="category-list">
        ${renderCategoryCard(category)}
      </div>

    `;

  }

  function renderCategoryCard(category) {

    const color = category.color || COLORS[0];

    const contents = filterContents(category.contents);

    return `

      <article class="category-card" style="${colorStyle(color)}" data-category-id="${category.id}">

        <div class="category-head">

          <div class="folder-icon">${escapeHtml(category.icon || "📁")}</div>

          <div class="category-title">
            <h3>${escapeHtml(category.name)}</h3>
            <p>${escapeHtml(category.description || "")}</p>
          </div>

          <div class="category-actions">

            <button class="mini-btn" title="Edit Category" data-action="edit-category" data-category-id="${category.id}">
              ✏️
            </button>

            <button class="mini-btn" title="Move Category to Trash" data-action="delete-category" data-category-id="${category.id}">
              🗑️
            </button>

          </div>

        </div>

        <div class="content-toolbar">

          <div class="add-content">

            <button type="button" data-action="open-content-menu" data-category-id="${category.id}">
              + Add Content
            </button>

            <div class="content-menu app-hidden" data-content-menu="${category.id}">
              ${contentMenuButton(category.id, "text", "📝", "Text Note")}
              ${contentMenuButton(category.id, "article", "📄", "Article")}
              ${contentMenuButton(category.id, "image", "🖼️", "Image")}
              ${contentMenuButton(category.id, "screenshot", "📸", "Screenshot")}
              ${contentMenuButton(category.id, "url", "🔗", "URL / Link")}
              ${contentMenuButton(category.id, "file", "📁", "File / Document")}
              ${contentMenuButton(category.id, "voice", "🎙️", "Voice Note")}
            </div>

          </div>

          <span style="color:var(--muted);font-size:12px">
            ${contents.length} item(s)
          </span>

        </div>

        ${
          contents.length
            ? `<div class="content-grid">${contents.map(content => renderContentItem(category, content)).join("")}</div>`
            : `
              <div class="empty-state" style="margin-top:14px">
                No content yet. Click <strong>+ Add Content</strong>
                to add a note, image, URL, document or voice note.
              </div>
            `
        }

      </article>

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

    let body = "";

    if (content.type === "text" || content.type === "article") {

      body = `<p>${escapeHtml(content.content || "")}</p>`;

    } else if (content.type === "image" || content.type === "screenshot") {

      body = `
        ${content.fileData ? `<img src="${content.fileData}" alt="${escapeHtml(content.title)}">` : ""}
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

      body = `
        ${
          content.fileData
            ? `
              <a href="${content.fileData}" download="${escapeAttribute(content.fileName || content.title)}">
                📥 Download ${escapeHtml(content.fileName || "document")}
              </a>
            `
            : `<p>${escapeHtml(content.fileName || "Document")}</p>`
        }
      `;

    } else if (content.type === "voice") {

      body = `
        ${
          content.fileData
            ? `<audio controls style="width:100%;margin-top:8px;" src="${content.fileData}"></audio>`
            : ""
        }
      `;

    }

    return `

      <div class="content-item" style="${colorStyle(color)}">

        <div class="content-item-head">

          <div class="content-icon">${getContentIcon(content.type)}</div>

          <div class="content-main">

            <h4>${escapeHtml(content.title || "Untitled")}</h4>

            ${body}

            <div class="content-meta">
              ${escapeHtml(content.type)}
              •
              ${formatTimestamp(content.updatedAt || content.createdAt)}
            </div>

          </div>

          <div class="content-actions">

            <button
              class="mini-btn"
              title="Copy Content"
              data-action="copy-content"
              data-category-id="${category.id}"
              data-content-id="${content.id}"
            >
              📋
            </button>

            <button
              class="mini-btn"
              title="Edit Content"
              data-action="edit-content"
              data-category-id="${category.id}"
              data-content-id="${content.id}"
            >
              ✎
            </button>

            <button
              class="mini-btn"
              title="Move to Trash"
              data-action="delete-content"
              data-category-id="${category.id}"
              data-content-id="${content.id}"
            >
              🗑️
            </button>

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
     ADD CATEGORY MODAL
  ======================================================= */

  function openCategoryModal(categoryId = null) {

    const category = categoryId
      ? state.data.categories.find(c => c.id === categoryId)
      : null;

    const editing = Boolean(category);

    showModal(`

      <h2>${editing ? "Edit Category" : "Create Category"}</h2>

      <p class="sub">
        ${editing ? "Update your category details." : "Create a new user-defined folder."}
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
        <button class="primary-btn" id="createCategoryButton" data-save-category="${categoryId || ""}">
          ${editing ? "Update Category" : "Create Category"}
        </button>
      </div>

    `);

    const button = document.getElementById("createCategoryButton");

    if (button) {

      button.addEventListener("click", () => saveCategory(categoryId));

    }

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

      const category = state.data.categories.find(c => c.id === categoryId);

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

    const category = {
      id: uid("category"),
      name,
      description,
      icon,
      systemRoute: null,
      color: randomColor(),
      contents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    state.data.categories.push(category);

    saveData();
    closeModal();
    renderSidebar();
    render();
    showToast("Category created successfully.", "success");

  }

  /* =======================================================
     ADD CONTENT MODAL
  ======================================================= */

  function openContentModal(categoryId, contentType = null, contentId = null) {

    const category = state.data.categories.find(c => c.id === categoryId);

    if (!category) {
      showToast("Category no longer exists.", "error");
      return;
    }

    const existing = contentId
      ? category.contents.find(c => c.id === contentId)
      : null;

    if (contentId && !existing) {
      showToast("Content no longer exists.", "error");
      return;
    }

    if (!contentType && existing) {
      contentType = existing.type;
    }

    if (!contentType) {
      toggleContentMenuById(categoryId);
      return;
    }

    const editing = Boolean(existing);

    const typeLabels = {
      text: "Text Note", article: "Article", image: "Image", screenshot: "Screenshot",
      url: "URL / Link", file: "File / Document", voice: "Voice Note"
    };

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

      <h2>${editing ? "Edit Content" : "Add " + typeLabels[contentType]}</h2>

      <p class="sub">Category: <strong>${escapeHtml(category.name)}</strong></p>

      <div class="form-grid">

        <div class="field">
          <label>Title</label>
          <input id="contentTitle" type="text" value="${escapeAttribute(existing?.title || "")}" placeholder="Enter title" autofocus>
        </div>

        ${
          contentType === "text" || contentType === "article"
            ? `
              <div class="field">
                <label>Content</label>
                <textarea id="contentBody" placeholder="Write your content here...">${escapeHtml(existing?.content || "")}</textarea>
              </div>
            `
            : ""
        }

        ${
          contentType === "url"
            ? `
              <div class="field">
                <label>Description</label>
                <textarea id="contentBody" placeholder="Optional description...">${escapeHtml(existing?.content || "")}</textarea>
              </div>
            `
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

  }

  /* =======================================================
     SAVE CONTENT
  ======================================================= */

  async function saveContent(categoryId, contentType, contentId) {

    const category = state.data.categories.find(c => c.id === categoryId);

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

    if (
      contentType === "image" || contentType === "screenshot" ||
      contentType === "file" || contentType === "voice"
    ) {

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

      const contentItem = category.contents.find(c => c.id === contentId);

      if (!contentItem) {
        showToast("Content no longer exists.", "error");
        closeModal();
        return;
      }

      contentItem.title = title;
      contentItem.content = content;
      contentItem.url = url;

      if (fileData) {
        contentItem.fileData = fileData;
        contentItem.fileName = fileName;
        contentItem.mimeType = mimeType;
      }

      contentItem.updatedAt = new Date().toISOString();

      saveData();
      closeModal();
      renderSidebar();
      render();
      showToast("Content updated successfully.", "success");

      return;

    }

    const newContent = {
      id: uid("content"),
      type: contentType,
      title,
      content,
      url,
      fileData,
      fileName,
      mimeType,
      color: randomColor(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!Array.isArray(category.contents)) {
      category.contents = [];
    }

    category.contents.push(newContent);
    category.updatedAt = new Date().toISOString();

    saveData();
    closeModal();
    renderSidebar();
    render();
    showToast("Content added successfully.", "success");

  }

  /* =======================================================
     FILE READER
  ======================================================= */

  function readFileAsDataURL(file) {

    return new Promise((resolve, reject) => {

      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);

      reader.readAsDataURL(file);

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
     PROFILE PHOTO PREVIEW (Dashboard)
  ======================================================= */

  async function previewProfilePhoto(input) {

    if (!input.files || !input.files.length) return;

    try {

      const dataUrl = await readFileAsDataURL(input.files[0]);

      pendingProfilePhoto = dataUrl;

      const photoEl = document.getElementById("dashProfilePhoto");

      if (photoEl) {
        photoEl.innerHTML = `<img src="${dataUrl}" alt="Profile photo">`;
      }

    } catch (error) {

      console.error(error);
      showToast("Unable to read the selected image.", "error");

    }

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

    saveData();
    renderSidebar();
    render();
    showToast("Category moved to Trash.", "success");

  }

  function copyContentToClipboard(categoryId, contentId) {

    const category = state.data.categories.find(c => c.id === categoryId);

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

    if (content.title) {
      textToCopy += content.title + "\n\n";
    }

    if (content.type === "url") {

      if (content.url) textToCopy += content.url + "\n\n";
      if (content.content) textToCopy += content.content;

    } else if (content.type === "file") {

      textToCopy += content.fileName || "Document";
      if (content.content) textToCopy += "\n\n" + content.content;

    } else {

      if (content.content) textToCopy += content.content;

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

    const category = state.data.categories.find(c => c.id === categoryId);

    if (!category) {
      showToast("Category not found.", "error");
      return;
    }

    const index = category.contents.findIndex(c => c.id === contentId);

    if (index === -1) {
      showToast("Content not found.", "error");
      return;
    }

    const content = category.contents[index];

    state.data.trash.push({
      id: uid("trash"),
      originalType: "content",
      categoryId,
      categoryName: category.name,
      originalData: JSON.parse(JSON.stringify(content)),
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

    return `

      <div class="trash-item">

        <div style="width:40px;height:40px;border-radius:10px;background:#fff0f4;display:grid;place-items:center;">
          ${isCategory ? "📁" : getContentIcon(type)}
        </div>

        <div class="trash-main">
          <strong>${escapeHtml(title || "Untitled")}</strong>
          <small>
            ${escapeHtml(type)}
            •
            Deleted ${formatTimestamp(item.deletedAt)}
            ${!isCategory && item.categoryName ? ` • ${escapeHtml(item.categoryName)}` : ""}
          </small>
        </div>

        <div class="trash-actions">
          <button class="secondary-btn" data-action="restore-trash" data-trash-id="${item.id}">
            ♻️ Restore
          </button>
          <button class="danger-btn" data-action="permanent-delete" data-trash-id="${item.id}">
            🗑️ Delete
          </button>
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

      state.data.categories.push(item.originalData);

    } else {

      const category = state.data.categories.find(c => c.id === item.categoryId);

      if (category) {

        category.contents.push(item.originalData);

      } else {

        const recoveryCategory = {
          id: uid("category"),
          name: item.categoryName || "Recovered Notes",
          description: "Recovered from Trash",
          icon: "♻️",
          systemRoute: null,
          color: randomColor(),
          contents: [item.originalData],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        state.data.categories.push(recoveryCategory);

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

    const confirmed = window.confirm("Permanently delete this item?");

    if (!confirmed) return;

    state.data.trash.splice(index, 1);

    saveData();
    renderSidebar();
    render();
    showToast("Item permanently deleted.", "success");

  }

  function emptyTrash() {

    if (!state.data.trash.length) return;

    const confirmed = window.confirm("Permanently delete everything in Trash?");

    if (!confirmed) return;

    state.data.trash = [];

    saveData();
    renderSidebar();
    render();
    showToast("Trash cleaned successfully.", "success");

  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  function renderSettings(page) {

    page.innerHTML = `

      <div class="page-head">
        <div>
          <h1>Settings</h1>
          <p>Manage your profile and workspace.</p>
        </div>
      </div>

      <div class="settings-grid">

        <div class="card settings-card">

          <h3>Profile</h3>

          <div class="form-grid">

            <div class="field">
              <label>Name</label>
              <input id="profileName" value="${escapeAttribute(state.profile.name)}">
            </div>

            <div class="field">
              <label>Email</label>
              <input id="profileEmail" type="email" value="${escapeAttribute(state.profile.email)}">
            </div>

            <div class="field">
              <label>Role</label>
              <input id="profileRole" value="${escapeAttribute(state.profile.role)}">
            </div>

            <div class="field">
              <label>Description</label>
              <textarea id="profileDescription">${escapeHtml(state.profile.description)}</textarea>
            </div>

            <button class="primary-btn" data-action="save-profile">Save Profile</button>

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

    state.profile = {
      name,
      email,
      role,
      description,
      photo: pendingProfilePhoto || state.profile.photo || null
    };

    pendingProfilePhoto = null;

    saveProfile();
    updateAvatar();
    render();
    showToast("Profile saved.", "success");

  }

  /* =======================================================
     CONTENT MENU
  ======================================================= */

  function toggleContentMenu(button) {

    const categoryId = button.dataset.categoryId;

    toggleContentMenuById(categoryId);

  }

  function toggleContentMenuById(categoryId) {

    document.querySelectorAll(".content-menu").forEach(menu => {

      const correct = menu.dataset.contentMenu === categoryId;

      if (correct) {
        menu.classList.toggle("app-hidden");
      } else {
        menu.classList.add("app-hidden");
      }

    });

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

    const theme = localStorage.getItem(THEME_KEY);

    if (theme === "dark") {
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

    return categories
      .map(category => {

        const categoryMatches =
          (category.name + " " + category.description)
            .toLowerCase()
            .includes(state.search);

        const contents = filterContents(category.contents);

        if (categoryMatches || contents.length) {

          return { ...category, contents: categoryMatches ? category.contents : contents };

        }

        return null;

      })
      .filter(Boolean);

  }

  function filterContents(contents) {

    if (!state.search) return contents || [];

    return (contents || []).filter(content => {

      const searchable = [
        content.title, content.content, content.url, content.fileName, content.type
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(state.search);

    });

  }

  /* =======================================================
     FIND CATEGORY
  ======================================================= */

  function findCategoryByRoute(route) {

    return state.data.categories.find(category => {

      if (category.systemRoute === route) return true;

      return normalize(category.name) === normalize(route);

    });

  }

  /* =======================================================
     UTILITIES
  ======================================================= */

  function normalize(value) {

    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  }

  function normalizeUrl(url) {

    if (/^https?:\/\//i.test(url)) return url;

    return "https://" + url;

  }

  function formatTimestamp(timestamp) {

    if (!timestamp) return "";

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium", timeStyle: "short"
    }).format(date);

  }

  function formatBytes(bytes) {

    if (!bytes) return "0 Bytes";

    const units = ["Bytes", "KB", "MB", "GB"];

    const index = Math.floor(Math.log(bytes) / Math.log(1024));

    return (
      parseFloat((bytes / Math.pow(1024, index)).toFixed(2)) + " " + units[index]
    );

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
      (total, category) =>
        total + (Array.isArray(category.contents) ? category.contents.length : 0),
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