/* =============================================================
   GENETIK BLEU - PRIVATE CLIENT + APPOINTMENT MANAGER
   =============================================================
   PHASE 2+ FOLLOW-UP REFINEMENT:
   - Google Authentication remains active.
   - Firestore /admins/{uid} controls private access.
   - Added inline client notes, client deletion, and a searchable
     client finder inside the Add Appointment dialog.
   ============================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

/* =============================================================
   MANUAL LIGHT / DARK MODE — PRIVATE DASHBOARD
   =============================================================
   Uses the same explicit localStorage preference as the public site so the
   experience stays consistent. It never follows the device/system theme.
   ============================================================= */
const ADMIN_THEME_STORAGE_KEY = "genetikBleuTheme";
const adminThemeToggle = document.querySelector("#admin-theme-toggle");

function getSavedAdminTheme() {
  try {
    return window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch (error) {
    return "light";
  }
}

function applyAdminTheme(theme, { save = false } = {}) {
  const darkMode = theme === "dark";

  if (darkMode) {
    document.documentElement.dataset.theme = "dark";
  } else {
    document.documentElement.removeAttribute("data-theme");
  }

  if (adminThemeToggle) {
    const label = adminThemeToggle.querySelector(".admin-theme-toggle-label");
    const icon = adminThemeToggle.querySelector(".admin-theme-toggle-icon");
    adminThemeToggle.setAttribute("aria-pressed", String(darkMode));
    adminThemeToggle.setAttribute("aria-label", darkMode ? "Turn off dark mode" : "Turn on dark mode");
    if (label) label.textContent = darkMode ? "Light mode" : "Dark mode";
    if (icon) icon.textContent = darkMode ? "☀" : "☾";
  }

  if (save) {
    try {
      window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, darkMode ? "dark" : "light");
    } catch (error) {
      /* The visual toggle still works even when localStorage is unavailable. */
    }
  }
}

applyAdminTheme(getSavedAdminTheme());

adminThemeToggle?.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyAdminTheme(nextTheme, { save: true });
});

const signedOutView = document.querySelector("#signed-out-view");
const pendingView = document.querySelector("#pending-view");
const dashboardView = document.querySelector("#dashboard-view");
const signInButton = document.querySelector("#google-sign-in");
const signOutButton = document.querySelector("#sign-out-button");
const authStatus = document.querySelector("#auth-status");
const pendingStatus = document.querySelector("#pending-status");
const uidOutput = document.querySelector("#current-user-uid");
const copyUidButton = document.querySelector("#copy-uid");
const clientCount = document.querySelector("#client-count");
const upcomingCount = document.querySelector("#upcoming-count");
const adminWelcome = document.querySelector("#admin-welcome");
const clientsList = document.querySelector("#clients-list");
const clientsEmpty = document.querySelector("#clients-empty");
const appointmentsList = document.querySelector("#appointments-list");
const appointmentsEmpty = document.querySelector("#appointments-empty");
const clientSearch = document.querySelector("#client-search");
const clientFilter = document.querySelector("#client-filter");
const clientSort = document.querySelector("#client-sort");
const clientsLoadMoreButton = document.querySelector("#clients-load-more");
const clientsShowingStatus = document.querySelector("#clients-showing-status");
const exportClientsButton = document.querySelector("#export-clients-button");
const exportClientsPdfButton = document.querySelector("#export-clients-pdf-button");
const clientExportMenu = document.querySelector("#client-export-menu");
const exportAppointmentsButton = document.querySelector("#export-appointments-button");
const appointmentViewStatus = document.querySelector("#appointment-view-status");
const appointmentsShowingStatus = document.querySelector("#appointments-showing-status");
const appointmentsLoadMoreButton = document.querySelector("#appointments-load-more");
const newAppointmentButton = document.querySelector("#new-appointment-button");
const birthdaySearch = document.querySelector("#birthday-search");
const birthdayFilter = document.querySelector("#birthday-filter");
const birthdayRewardsList = document.querySelector("#birthday-rewards-list");
const birthdayRewardsEmpty = document.querySelector("#birthday-rewards-empty");
const birthdayNext30Count = document.querySelector("#birthday-next-30-count");
const birthdayEnabledCount = document.querySelector("#birthday-enabled-count");
const appointmentDialog = document.querySelector("#appointment-dialog");
const appointmentForm = document.querySelector("#appointment-form");
const appointmentClientSearch = document.querySelector("#appointment-client-search");
const appointmentClientBrowse = document.querySelector("#appointment-client-browse");
const appointmentClient = document.querySelector("#appointment-client");
const appointmentClientMatches = document.querySelector("#appointment-client-matches");
const appointmentSelectedClient = document.querySelector("#appointment-selected-client");
const appointmentSelectedClientName = document.querySelector("#appointment-selected-client-name");
const appointmentSelectedClientMeta = document.querySelector("#appointment-selected-client-meta");
const appointmentClearClient = document.querySelector("#appointment-clear-client");
const appointmentDate = document.querySelector("#appointment-date");
const appointmentTime = document.querySelector("#appointment-time");
const appointmentService = document.querySelector("#appointment-service");
const appointmentStatus = document.querySelector("#appointment-status");
const appointmentNotes = document.querySelector("#appointment-notes");
const appointmentId = document.querySelector("#appointment-id");
const appointmentDelete = document.querySelector("#appointment-delete");
const appointmentCancel = document.querySelector("#appointment-cancel");
const appointmentClose = document.querySelector("#appointment-close");
const appointmentStatusMessage = document.querySelector("#appointment-status-message");
const appointmentDialogTitle = document.querySelector("#appointment-dialog-title");

const birthdayRewardDialog = document.querySelector("#birthday-reward-dialog");
const birthdayRewardForm = document.querySelector("#birthday-reward-form");
const birthdayRewardClientId = document.querySelector("#birthday-reward-client-id");
const birthdayRewardClientName = document.querySelector("#birthday-reward-client-name");
const birthdayRewardClientMeta = document.querySelector("#birthday-reward-client-meta");
const birthdayRewardConsentWarning = document.querySelector("#birthday-reward-consent-warning");
const birthdayRewardEnabled = document.querySelector("#birthday-reward-enabled");
const birthdayRewardAmount = document.querySelector("#birthday-reward-amount");
const birthdayRewardMinimum = document.querySelector("#birthday-reward-minimum");
const birthdayRewardValidDays = document.querySelector("#birthday-reward-valid-days");
const birthdayRewardDelivery = document.querySelector("#birthday-reward-delivery");
const birthdayRewardPreviewText = document.querySelector("#birthday-reward-preview-text");
const birthdayRewardClose = document.querySelector("#birthday-reward-close");
const birthdayRewardCancel = document.querySelector("#birthday-reward-cancel");
const birthdayRewardStatus = document.querySelector("#birthday-reward-status");

let clients = [];
let appointments = [];
let upcomingAppointments = [];
let historyAppointments = [];
let upcomingLastDoc = null;
let historyLastDoc = null;
let upcomingHasMore = false;
let historyHasMore = false;
let appointmentBoundaryTimestamp = null;
let currentAppointmentView = "upcoming";
let clientDisplayLimit = 60;
let currentUser = null;
let isAdmin = false;
const clientNoteSaveTimers = new Map();
const UPCOMING_PAGE_SIZE = 100;
const HISTORY_PAGE_SIZE = 50;

signInButton.addEventListener("click", async () => {
  authStatus.textContent = "Opening Google sign-in...";
  authStatus.classList.remove("is-error");

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google sign-in failed:", error);
    showAuthError(error);
  }
});

signOutButton.addEventListener("click", () => signOut(auth));

copyUidButton.addEventListener("click", async () => {
  const uid = uidOutput.textContent.trim();
  if (!uid) return;
  try {
    await navigator.clipboard.writeText(uid);
    pendingStatus.textContent = "UID copied.";
  } catch {
    pendingStatus.textContent = "Copy did not work automatically. Select the UID above and copy it manually.";
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  resetViews();

  if (!user) {
    signedOutView.hidden = false;
    signOutButton.hidden = true;
    return;
  }

  signOutButton.hidden = false;
  uidOutput.textContent = user.uid;

  try {
    const adminSnapshot = await getDoc(doc(db, "admins", user.uid));
    isAdmin = adminSnapshot.exists();
  } catch (error) {
    console.error("Admin authorization check failed:", error);
    isAdmin = false;
  }

  if (!isAdmin) {
    pendingView.hidden = false;
    return;
  }

  dashboardView.hidden = false;
  adminWelcome.textContent = user.displayName ? `Welcome, ${user.displayName}` : "Salon Dashboard";
  await loadDashboard();
});

function resetViews() {
  signedOutView.hidden = true;
  pendingView.hidden = true;
  dashboardView.hidden = true;
  authStatus.textContent = "";
  pendingStatus.textContent = "";
}

function showAuthError(error) {
  let message = "Google sign-in could not be completed.";
  if (error?.code === "auth/unauthorized-domain") {
    message = `This website domain is not authorized in Firebase Authentication yet. Add "${window.location.hostname}" under Authentication → Settings → Authorized domains.`;
  } else if (error?.code === "auth/popup-blocked") {
    message = "The browser blocked the Google sign-in window. On iPhone/iPad, go to Settings → Apps → Safari and turn off Block Pop-ups temporarily, then try again.";
  } else if (error?.code === "auth/popup-closed-by-user") {
    message = "The Google sign-in window was closed before sign-in finished. Tap Sign in with Google and complete the account selection again.";
  } else if (error?.code === "auth/cancelled-popup-request") {
    message = "Another sign-in attempt was already opening. Wait a moment, then try again.";
  }
  authStatus.textContent = message;
  authStatus.classList.add("is-error");
}

async function loadDashboard() {
  await Promise.all([loadClients(), loadAppointments()]);
  populateAppointmentClientBrowse();
  clearAppointmentClientSelection();
  renderClients();
  renderAppointments();
  renderBirthdayRewards();
  updateCounts();

  if (exportClientsButton) {
    exportClientsButton.disabled = clients.length === 0;
    exportClientsButton.title = clients.length === 0
      ? "There are no clients to export yet."
      : "Download the client directory as a CSV spreadsheet file.";
  }

  if (exportClientsPdfButton) {
    exportClientsPdfButton.disabled = clients.length === 0;
    exportClientsPdfButton.title = clients.length === 0
      ? "There are no clients to export yet."
      : "Download an easy-to-read PDF of the client directory.";
  }

  if (clientExportMenu) {
    clientExportMenu.classList.toggle("is-disabled", clients.length === 0);
    if (clients.length === 0) clientExportMenu.open = false;
  }
}

async function loadClients() {
  const snapshot = await getDocs(collection(db, "clients"));
  clients = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  clients.sort((a, b) =>
    `${a.lastName || ""} ${a.firstName || ""}`.localeCompare(`${b.lastName || ""} ${b.firstName || ""}`, undefined, { sensitivity: "base" })
  );
}

async function loadAppointments() {
  appointmentBoundaryTimestamp = Timestamp.fromDate(new Date());
  upcomingAppointments = [];
  historyAppointments = [];
  upcomingLastDoc = null;
  historyLastDoc = null;

  await Promise.all([
    loadAppointmentPage("upcoming", false),
    loadAppointmentPage("history", false)
  ]);

  rebuildLoadedAppointments();
}

async function loadAppointmentPage(view, append = false) {
  if (!appointmentBoundaryTimestamp) {
    appointmentBoundaryTimestamp = Timestamp.fromDate(new Date());
  }

  const isUpcoming = view === "upcoming";
  const pageSize = isUpcoming ? UPCOMING_PAGE_SIZE : HISTORY_PAGE_SIZE;
  const cursor = isUpcoming ? upcomingLastDoc : historyLastDoc;

  const constraints = isUpcoming
    ? [where("startAt", ">=", appointmentBoundaryTimestamp), orderBy("startAt", "asc")]
    : [where("startAt", "<", appointmentBoundaryTimestamp), orderBy("startAt", "desc")];

  if (append && cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(collection(db, "appointments"), ...constraints));
  const page = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  if (isUpcoming) {
    upcomingAppointments = append ? [...upcomingAppointments, ...page] : page;
    upcomingLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    upcomingHasMore = snapshot.size === pageSize;
  } else {
    historyAppointments = append ? [...historyAppointments, ...page] : page;
    historyLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
    historyHasMore = snapshot.size === pageSize;
  }

  rebuildLoadedAppointments();
}

function rebuildLoadedAppointments() {
  const byId = new Map();
  [...upcomingAppointments, ...historyAppointments].forEach((appointment) => {
    byId.set(appointment.id, appointment);
  });
  appointments = Array.from(byId.values());
}

function updateCounts() {
  clientCount.textContent = String(clients.length);

  // "Upcoming" means a future appointment that still needs to happen.
  // Completed and cancelled appointments should never count as upcoming,
  // even when their scheduled date/time is still in the future.
  const now = Date.now();
  const activeUpcomingStatuses = new Set(["scheduled", "confirmed"]);
  const upcoming = upcomingAppointments.filter((appointment) => {
    return (
      toMillis(appointment.startAt) >= now &&
      activeUpcomingStatuses.has(appointment.status || "scheduled")
    );
  }).length;

  upcomingCount.textContent = upcomingHasMore ? `${upcoming}+` : String(upcoming);
}

function renderClients() {
  const term = clientSearch.value.trim().toLowerCase();
  const filter = clientFilter?.value || "all";
  const sort = clientSort?.value || "name";

  let filtered = clients.filter((client) => {
    const haystack = `${client.firstName || ""} ${client.lastName || ""} ${client.email || ""} ${client.phone || ""} ${formatClientBirthday(client)} ${client.clientNote || client.note || ""}`.toLowerCase();
    if (term && !haystack.includes(term)) return false;

    if (filter === "birthday") return hasClientBirthday(client);
    if (filter === "reward-enabled") return client.birthdayRewardEnabled === true;
    if (filter === "marketing") return client.marketingConsent === true;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === "newest") {
      return toMillis(b.createdAt) - toMillis(a.createdAt);
    }
    if (sort === "birthday") {
      const aBirthday = getNextBirthdayInfo(a)?.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bBirthday = getNextBirthdayInfo(b)?.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aBirthday !== bBirthday) return aBirthday - bBirthday;
    }
    return `${a.lastName || ""} ${a.firstName || ""}`.localeCompare(
      `${b.lastName || ""} ${b.firstName || ""}`,
      undefined,
      { sensitivity: "base" }
    );
  });

  const visible = filtered.slice(0, clientDisplayLimit);
  clientsList.innerHTML = "";
  clientsEmpty.hidden = filtered.length !== 0;

  visible.forEach((client) => {
    const row = document.createElement("article");
    row.className = "client-row client-row-rich";
    row.innerHTML = `
      <div>
        <span class="row-label">Client</span>
        <h4>${escapeHtml(client.lastName || "")}, ${escapeHtml(client.firstName || "")}</h4>
        <p>Registered ${formatTimestamp(client.createdAt)}</p>
        ${client.birthdayMonth && client.birthdayDay ? `
          <div class="client-birthday-meta">
            <span class="client-birthday-chip">Birthday · ${escapeHtml(formatClientBirthday(client))}</span>
            ${client.birthdayRewardEnabled === true
              ? '<span class="client-birthday-status is-eligible">Reward enabled</span>'
              : ''}
          </div>
        ` : ''}
      </div>
      <div>
        <span class="row-label">Phone</span>
        <p>${escapeHtml(client.phone || "—")}</p>
      </div>
      <div>
        <span class="row-label">Email</span>
        <p>${escapeHtml(client.email || "—")}</p>
      </div>
      <div class="client-note-box">
        <span class="row-label">Client Note</span>
        <textarea class="client-note-input" rows="2" maxlength="500" placeholder="Add a quick note about this client...">${escapeHtml(client.clientNote || client.note || "")}</textarea>
        <p class="client-inline-status" aria-live="polite"></p>
      </div>

      <div class="client-actions client-actions-side-rail" aria-label="Client actions">
        <button
          class="client-icon-button client-add-appointment"
          type="button"
          aria-label="Add appointment"
          title="Add appointment"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3v3M17 3v3M4 9h16"></path>
            <rect x="4" y="5" width="16" height="15" rx="2"></rect>
            <path d="M12 12v5M9.5 14.5h5"></path>
          </svg>
        </button>

        <span class="client-action-safety-gap" aria-hidden="true"></span>

        <button
          class="client-icon-button client-delete"
          type="button"
          aria-label="Delete client"
          title="Delete client"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"></path>
            <path d="M10 10v6M14 10v6"></path>
          </svg>
        </button>
      </div>
    `;

    const noteInput = row.querySelector(".client-note-input");
    const statusOutput = row.querySelector(".client-inline-status");
    const addAppointmentButton = row.querySelector(".client-add-appointment");
    const deleteButton = row.querySelector(".client-delete");

    noteInput.addEventListener("input", () => {
      statusOutput.textContent = "Saving automatically...";
      clearClientNoteTimer(client.id);

      const timer = window.setTimeout(() => {
        clientNoteSaveTimers.delete(client.id);
        saveClientNote(client.id, noteInput.value, statusOutput, true);
      }, 850);

      clientNoteSaveTimers.set(client.id, timer);
    });

    noteInput.addEventListener("blur", () => {
      if (!clientNoteSaveTimers.has(client.id)) return;
      clearClientNoteTimer(client.id);
      saveClientNote(client.id, noteInput.value, statusOutput, true);
    });

    noteInput.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        clearClientNoteTimer(client.id);
        saveClientNote(client.id, noteInput.value, statusOutput);
      }
    });

    addAppointmentButton.addEventListener("click", () => openAppointmentDialog(null, client.id));
    deleteButton.addEventListener("click", () => {
      deleteClientAndAppointments(client, row, deleteButton);
    });

    clientsList.appendChild(row);
  });

  if (clientsShowingStatus) {
    clientsShowingStatus.textContent = filtered.length
      ? `Showing ${visible.length} of ${filtered.length} matching clients.`
      : "";
  }

  if (clientsLoadMoreButton) {
    clientsLoadMoreButton.hidden = visible.length >= filtered.length;
  }
}

function renderAppointments() {
  const source = currentAppointmentView === "history"
    ? historyAppointments
    : upcomingAppointments;

  appointmentsList.innerHTML = "";
  appointmentsEmpty.hidden = source.length !== 0;
  appointmentsEmpty.textContent = currentAppointmentView === "history"
    ? "No past appointments in the loaded history."
    : "No upcoming appointments have been added yet.";

  source.forEach((appointment) => {
    const row = document.createElement("article");
    row.className = "appointment-row";
    row.innerHTML = `
      <div>
        <span class="row-label">Client</span>
        <h4>${escapeHtml(appointment.clientName || "Client")}</h4>
        <p>${escapeHtml(appointment.service || "Service")}</p>
      </div>
      <div>
        <span class="row-label">Date + Time</span>
        <p>${formatDateTime(appointment.startAt)}</p>
      </div>
      <div>
        <span class="row-label">Status</span>
        <p><span class="status-pill status-${escapeHtml(appointment.status || "scheduled")}">${escapeHtml(appointment.status || "scheduled")}</span></p>
      </div>
      <button class="admin-button admin-button-small admin-button-ghost" type="button">Edit</button>
    `;
    row.querySelector("button").addEventListener("click", () => openAppointmentDialog(appointment));
    appointmentsList.appendChild(row);
  });

  const hasMore = currentAppointmentView === "history" ? historyHasMore : upcomingHasMore;
  appointmentsLoadMoreButton.hidden = !hasMore;
  appointmentsLoadMoreButton.textContent = currentAppointmentView === "history"
    ? "Load Older Appointments"
    : "Load More Upcoming";

  if (appointmentsShowingStatus) {
    const label = currentAppointmentView === "history" ? "past appointments" : "upcoming appointments";
    appointmentsShowingStatus.textContent = source.length
      ? `Loaded ${source.length} ${label}.`
      : "";
  }

  if (appointmentViewStatus) {
    appointmentViewStatus.textContent = currentAppointmentView === "history"
      ? "History loads 50 at a time."
      : "Upcoming loads 100 at a time.";
  }
}

clientSearch.addEventListener("input", () => {
  clientDisplayLimit = 60;
  renderClients();
});

clientFilter?.addEventListener("change", () => {
  clientDisplayLimit = 60;
  renderClients();
});

clientSort?.addEventListener("change", () => {
  clientDisplayLimit = 60;
  renderClients();
});

clientsLoadMoreButton?.addEventListener("click", () => {
  clientDisplayLimit += 60;
  renderClients();
});

if (clientExportMenu) {
  clientExportMenu.addEventListener("toggle", () => {
    if (clientExportMenu.classList.contains("is-disabled")) {
      clientExportMenu.open = false;
    }
  });
}

if (exportClientsButton) {
  exportClientsButton.addEventListener("click", () => {
    exportClientsCsv();
    if (clientExportMenu) clientExportMenu.open = false;
  });
}

if (exportClientsPdfButton) {
  exportClientsPdfButton.addEventListener("click", () => {
    exportClientsPdf();
    if (clientExportMenu) clientExportMenu.open = false;
  });
}

if (exportAppointmentsButton) {
  exportAppointmentsButton.addEventListener("click", exportAppointmentsCsv);
}

appointmentsLoadMoreButton?.addEventListener("click", async () => {
  appointmentsLoadMoreButton.disabled = true;
  try {
    await loadAppointmentPage(currentAppointmentView, true);
    renderAppointments();
  } catch (error) {
    console.error("Could not load more appointments:", error);
    appointmentsShowingStatus.textContent = "Could not load more appointments.";
  } finally {
    appointmentsLoadMoreButton.disabled = false;
  }
});

document.querySelectorAll("[data-appointment-view]").forEach((button) => {
  button.addEventListener("click", () => {
    currentAppointmentView = button.dataset.appointmentView;
    document.querySelectorAll("[data-appointment-view]").forEach((item) => {
      item.classList.toggle("is-active", item === button);
    });
    renderAppointments();
  });
});

birthdaySearch?.addEventListener("input", renderBirthdayRewards);
birthdayFilter?.addEventListener("change", renderBirthdayRewards);

document.querySelectorAll(".admin-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((tab) => {
      const isActive = tab === button;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.remove("is-active"));
    document.querySelector(`#${button.dataset.tab}-panel`).classList.add("is-active");
  });
});

newAppointmentButton.addEventListener("click", () => openAppointmentDialog());
appointmentCancel.addEventListener("click", () => appointmentDialog.close());
appointmentClose.addEventListener("click", () => appointmentDialog.close());

function normalizeClientSearch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function clientMatchesAppointmentSearch(client, value) {
  const normalizedSearch = normalizeClientSearch(value);
  if (!normalizedSearch) return true;

  const terms = normalizedSearch.split(" ").filter(Boolean);
  const haystack = normalizeClientSearch(
    `${client.firstName || ""} ${client.lastName || ""} ` +
    `${client.lastName || ""} ${client.firstName || ""} ` +
    `${client.email || ""} ${client.phone || ""}`
  );

  return terms.every((term) => haystack.includes(term));
}

function populateAppointmentClientBrowse(selectedClientId = "") {
  appointmentClientBrowse.innerHTML =
    '<option value="">Browse all registered clients</option>';

  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;

    const name =
      `${client.lastName || ""}, ${client.firstName || ""}`.replace(/^,\s*/, "").trim();
    const clue = client.phone || client.email || "";

    option.textContent = clue ? `${name} — ${clue}` : name;
    appointmentClientBrowse.appendChild(option);
  });

  appointmentClientBrowse.value = selectedClientId || "";
}

function clearAppointmentClientSelection({ clearSearch = false, clearBrowse = true } = {}) {
  appointmentClient.innerHTML = '<option value=""></option>';
  appointmentClient.value = "";
  appointmentSelectedClient.hidden = true;
  appointmentSelectedClientName.textContent = "";
  appointmentSelectedClientMeta.textContent = "";

  if (clearSearch) {
    appointmentClientSearch.value = "";
  }

  if (clearBrowse) {
    appointmentClientBrowse.value = "";
  }
}

function selectAppointmentClient(
  client,
  { syncSearch = true, syncBrowse = true } = {}
) {
  if (!client) {
    clearAppointmentClientSelection();
    return;
  }

  appointmentClient.innerHTML = "";
  const option = document.createElement("option");
  option.value = client.id;
  option.textContent = `${client.lastName || ""}, ${client.firstName || ""}`;
  appointmentClient.appendChild(option);
  appointmentClient.value = client.id;

  appointmentSelectedClientName.textContent =
    `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client";

  const metaParts = [client.email, client.phone].filter(Boolean);
  appointmentSelectedClientMeta.textContent = metaParts.join("  •  ");
  appointmentSelectedClient.hidden = false;

  if (syncSearch) {
    appointmentClientSearch.value =
      `${client.lastName || ""}, ${client.firstName || ""}`.replace(/^,\s*/, "").trim();
  }

  if (syncBrowse) {
    appointmentClientBrowse.value = client.id;
  }

  appointmentClientMatches.hidden = true;
  appointmentClientMatches.innerHTML = "";
}

function renderAppointmentClientMatches() {
  const searchValue = appointmentClientSearch.value.trim();

  // Any new typing starts a fresh selection.
  clearAppointmentClientSelection();

  if (!searchValue) {
    appointmentClientMatches.hidden = true;
    appointmentClientMatches.innerHTML = "";
    return;
  }

  const matches = clients.filter((client) =>
    clientMatchesAppointmentSearch(client, searchValue)
  );

  // A single remaining search result is selected automatically.
  // This keeps the search field usable without a separate dropdown selection.
  if (matches.length === 1) {
    selectAppointmentClient(matches[0], { syncSearch: false });
    return;
  }

  appointmentClientMatches.innerHTML = "";

  if (matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "appointment-client-empty";
    empty.textContent = "No matching clients.";
    appointmentClientMatches.appendChild(empty);
    appointmentClientMatches.hidden = false;
    return;
  }

  matches.slice(0, 8).forEach((client) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "appointment-client-match";
    button.innerHTML = `
      <strong>${escapeHtml(`${client.firstName || ""} ${client.lastName || ""}`.trim())}</strong>
      <span>${escapeHtml([client.email, client.phone].filter(Boolean).join(" • "))}</span>
    `;

    button.addEventListener("click", () => {
      selectAppointmentClient(client);
      appointmentClientSearch.focus();
    });

    appointmentClientMatches.appendChild(button);
  });

  appointmentClientMatches.hidden = false;
}

appointmentClientSearch.addEventListener("input", renderAppointmentClientMatches);

appointmentClientBrowse.addEventListener("change", () => {
  const selectedClient = clients.find(
    (client) => client.id === appointmentClientBrowse.value
  );

  if (!selectedClient) {
    clearAppointmentClientSelection({ clearSearch: true, clearBrowse: false });
    return;
  }

  selectAppointmentClient(selectedClient, {
    syncSearch: true,
    syncBrowse: false
  });
});

appointmentClearClient.addEventListener("click", () => {
  clearAppointmentClientSelection({ clearSearch: true, clearBrowse: true });
  appointmentClientMatches.hidden = true;
  appointmentClientMatches.innerHTML = "";
  appointmentClientSearch.focus();
});

function openAppointmentDialog(appointment = null, preselectedClientId = "") {
  appointmentForm.reset();
  populateAppointmentClientBrowse();
  clearAppointmentClientSelection({ clearSearch: true, clearBrowse: true });
  appointmentClientMatches.hidden = true;
  appointmentClientMatches.innerHTML = "";

  appointmentStatusMessage.textContent = "";
  appointmentId.value = appointment?.id || "";
  appointmentDelete.hidden = !appointment;
  appointmentDialogTitle.textContent = appointment ? "Edit Appointment" : "Add Appointment";

  if (appointment) {
    const relatedClient = clients.find((item) => item.id === appointment.clientId);
    if (relatedClient) {
      selectAppointmentClient(relatedClient);
    }

    const date = timestampToLocalDate(appointment.startAt);
    appointmentDate.value = date.date;
    appointmentTime.value = date.time;
    appointmentService.value = appointment.service || "";
    appointmentStatus.value = appointment.status || "scheduled";
    appointmentNotes.value = appointment.notes || "";
  } else {
    const relatedClient = clients.find((item) => item.id === preselectedClientId);
    if (relatedClient) {
      selectAppointmentClient(relatedClient);
    }
    appointmentStatus.value = "scheduled";
  }

  appointmentDialog.showModal();

  if (!appointmentClient.value) {
    window.setTimeout(() => appointmentClientSearch.focus(), 40);
  }
}

appointmentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin || !currentUser) return;

  const client = clients.find((item) => item.id === appointmentClient.value);
  if (!client) {
    appointmentStatusMessage.textContent = "Choose a client.";
    return;
  }

  const localDateTime = new Date(`${appointmentDate.value}T${appointmentTime.value}:00`);
  if (Number.isNaN(localDateTime.getTime())) {
    appointmentStatusMessage.textContent = "Choose a valid date and time.";
    return;
  }

  const payload = {
    clientId: client.id,
    clientName: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
    clientEmail: client.email || "",
    clientPhone: client.phone || "",
    service: appointmentService.value.trim(),
    startAt: Timestamp.fromDate(localDateTime),
    status: appointmentStatus.value,
    notes: appointmentNotes.value.trim(),
    updatedAt: serverTimestamp()
  };

  try {
    if (appointmentId.value) {
      const existingAppointment = appointments.find(
        (item) => item.id === appointmentId.value
      );

      // If the client, service, date/time, or email changes, the backend should
      // send a fresh appointment update and schedule a new reminder for the
      // revised appointment details.
      if (existingAppointment && appointmentDeliveryDetailsChanged(existingAppointment, payload)) {
        payload.confirmationEmailSent = false;
        payload.reminderEmailSent = false;
      }

      await updateDoc(doc(db, "appointments", appointmentId.value), payload);
    } else {
      await addDoc(collection(db, "appointments"), {
        ...payload,
        confirmationEmailSent: false,
        confirmationSmsSent: false,
        reminderEmailSent: false,
        reminderSmsSent: false,
        createdAt: serverTimestamp()
      });
    }
    appointmentDialog.close();
    await loadAppointments();
    renderAppointments();
    updateCounts();
  } catch (error) {
    console.error("Appointment save failed:", error);
    appointmentStatusMessage.textContent = "The appointment could not be saved.";
  }
});

function appointmentDeliveryDetailsChanged(existingAppointment, nextPayload) {
  return (
    (existingAppointment.clientId || "") !== (nextPayload.clientId || "") ||
    (existingAppointment.clientEmail || "").trim().toLowerCase() !==
      (nextPayload.clientEmail || "").trim().toLowerCase() ||
    (existingAppointment.clientName || "").trim() !==
      (nextPayload.clientName || "").trim() ||
    (existingAppointment.service || "").trim() !==
      (nextPayload.service || "").trim() ||
    toMillis(existingAppointment.startAt) !== toMillis(nextPayload.startAt)
  );
}

appointmentDelete.addEventListener("click", async () => {
  if (!appointmentId.value || !isAdmin) return;
  if (!window.confirm("Delete this appointment?")) return;
  try {
    await deleteDoc(doc(db, "appointments", appointmentId.value));
    appointmentDialog.close();
    await loadAppointments();
    renderAppointments();
    updateCounts();
  } catch (error) {
    console.error("Appointment delete failed:", error);
    appointmentStatusMessage.textContent = "The appointment could not be deleted.";
  }
});

function clearClientNoteTimer(clientId) {
  const timer = clientNoteSaveTimers.get(clientId);
  if (timer) window.clearTimeout(timer);
  clientNoteSaveTimers.delete(clientId);
}

async function saveClientNote(clientId, noteValue, statusOutput, isAutoSave = false) {
  if (!isAdmin) return;
  const cleanNote = noteValue.trim().slice(0, 500);
  statusOutput.textContent = isAutoSave ? "Saving automatically..." : "Saving...";

  try {
    await updateDoc(doc(db, "clients", clientId), {
      clientNote: cleanNote,
      updatedAt: serverTimestamp()
    });

    const clientIndex = clients.findIndex((client) => client.id === clientId);
    if (clientIndex >= 0) {
      clients[clientIndex].clientNote = cleanNote;
    }

    statusOutput.textContent = isAutoSave ? "Saved automatically." : "Saved.";
    window.setTimeout(() => {
      if (
        statusOutput.textContent === "Saved." ||
        statusOutput.textContent === "Saved automatically."
      ) {
        statusOutput.textContent = "";
      }
    }, 1800);
  } catch (error) {
    console.error("Client note save failed:", error);
    statusOutput.textContent = "Could not save note.";
  }
}

async function deleteClientAndAppointments(client, rowElement, deleteButton) {
  if (!isAdmin || !client?.id) return;

  const clientName =
    `${client.firstName || ""} ${client.lastName || ""}`.trim() || "this client";

  const confirmDelete = window.confirm(
    `Delete ${clientName} from Registered Clients?\n\nThis will also delete any appointments tied to that client.`
  );

  if (!confirmDelete) return;

  // Prevent a pending note autosave from firing while this client is being removed.
  clearClientNoteTimer(client.id);

  // Immediate button feedback prevents ambiguous taps on slower mobile connections.
  if (rowElement) {
    rowElement.classList.add("is-deleting");
    rowElement.setAttribute("aria-busy", "true");
  }

  if (deleteButton) {
    deleteButton.disabled = true;
    deleteButton.setAttribute("aria-label", "Deleting client");
    deleteButton.setAttribute("title", "Deleting client…");
  }

  try {
    const linkedAppointmentsSnapshot = await getDocs(
      query(collection(db, "appointments"), where("clientId", "==", client.id))
    );

    // Delete the client and all linked appointments in one Firestore batch.
    // This is more reliable than several separate delete requests, especially on mobile.
    const batch = writeBatch(db);

    linkedAppointmentsSnapshot.docs.forEach((appointmentDoc) => {
      batch.delete(appointmentDoc.ref);
    });

    batch.delete(doc(db, "clients", client.id));
    await batch.commit();

    await loadDashboard();
  } catch (error) {
    console.error("Client delete failed:", error);

    if (rowElement) {
      rowElement.classList.remove("is-deleting");
      rowElement.removeAttribute("aria-busy");
    }

    if (deleteButton) {
      deleteButton.disabled = false;
      deleteButton.setAttribute("aria-label", "Delete client");
      deleteButton.setAttribute("title", "Delete client");
    }

    window.alert("That client could not be deleted. Please try again.");
  }
}



function hasClientBirthday(client) {
  return Number(client?.birthdayMonth || 0) > 0 && Number(client?.birthdayDay || 0) > 0;
}

function getNextBirthdayInfo(client) {
  if (!hasClientBirthday(client)) return null;

  const now = new Date();
  const month = Number(client.birthdayMonth);
  const day = Number(client.birthdayDay);

  const makeBirthday = (year) => {
    // Feb. 29 falls back to Feb. 28 for non-leap-year sorting/display.
    if (month === 2 && day === 29) {
      const leap = new Date(year, 1, 29).getMonth() === 1;
      return new Date(year, 1, leap ? 29 : 28, 12, 0, 0, 0);
    }
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  };

  let nextDate = makeBirthday(now.getFullYear());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  if (nextDate < today) {
    nextDate = makeBirthday(now.getFullYear() + 1);
  }

  const daysAway = Math.max(0, Math.ceil((nextDate - today) / 86400000));
  return { date: nextDate, daysAway };
}

function renderBirthdayRewards() {
  if (!birthdayRewardsList) return;

  const term = (birthdaySearch?.value || "").trim().toLowerCase();
  const filter = birthdayFilter?.value || "upcoming";

  const birthdayClients = clients
    .filter(hasClientBirthday)
    .map((client) => ({ client, next: getNextBirthdayInfo(client) }))
    .filter(({ client, next }) => {
      const haystack = `${client.firstName || ""} ${client.lastName || ""} ${client.email || ""} ${client.phone || ""} ${formatClientBirthday(client)}`.toLowerCase();
      if (term && !haystack.includes(term)) return false;
      if (filter === "upcoming") return next && next.daysAway <= 90;
      if (filter === "enabled") return client.birthdayRewardEnabled === true;
      if (filter === "needs-setup") return client.birthdayRewardEnabled !== true;
      return true;
    })
    .sort((a, b) => {
      const aTime = a.next?.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.next?.date?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return `${a.client.lastName || ""} ${a.client.firstName || ""}`.localeCompare(
        `${b.client.lastName || ""} ${b.client.firstName || ""}`,
        undefined,
        { sensitivity: "base" }
      );
    });

  birthdayRewardsList.innerHTML = "";
  birthdayRewardsEmpty.hidden = birthdayClients.length !== 0;

  birthdayClients.forEach(({ client, next }) => {
    const enabled = client.birthdayRewardEnabled === true;
    const marketingEligible = client.marketingConsent === true;
    const amount = Number(client.birthdayRewardAmount || 25);
    const minimum = Number(client.birthdayRewardMinimumSpend ?? 75);
    const validDays = Number(client.birthdayRewardValidDays || 30);
    const delivery = client.birthdayRewardDelivery || "email";

    const card = document.createElement("article");
    card.className = `birthday-reward-card${enabled ? " is-enabled" : ""}`;

    const timing = next?.daysAway === 0
      ? "Today"
      : next?.daysAway === 1
        ? "Tomorrow"
        : next
          ? `In ${next.daysAway} days`
          : "";

    const automationLabel = !marketingEligible
      ? "Automatic delivery unavailable"
      : enabled
        ? `Reward enabled · ${formatDeliveryLabel(delivery)}`
        : "Not selected for a reward";

    card.innerHTML = `
      <div class="birthday-reward-date-block">
        <span class="birthday-reward-month">${escapeHtml(getBirthdayMonthShort(client))}</span>
        <strong>${escapeHtml(String(client.birthdayDay || ""))}</strong>
        <small>${escapeHtml(timing)}</small>
      </div>

      <div class="birthday-reward-client-block">
        <span class="row-label">Client</span>
        <h4>${escapeHtml(`${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client")}</h4>
        <p>${escapeHtml([client.email, client.phone].filter(Boolean).join(" • ") || "No contact details")}</p>
        <div class="birthday-reward-tags">
          <span class="birthday-reward-tag ${marketingEligible ? "is-ok" : "is-warning"}">${marketingEligible ? "Marketing consent" : "No marketing consent"}</span>
          <span class="birthday-reward-tag ${enabled ? "is-enabled" : ""}">${escapeHtml(automationLabel)}</span>
        </div>
      </div>

      <div class="birthday-reward-plan-block">
        <span class="row-label">Reward plan</span>
        <p class="birthday-reward-plan-primary">${enabled ? `$${amount} toward service` : "No automatic reward selected"}</p>
        ${enabled ? `<p>${minimum > 0 ? `$${minimum}+ service · ` : ""}${validDays} days</p>` : ""}
        ${client.birthdayRewardLastSentYear ? `<p class="birthday-reward-history">Last sent: ${escapeHtml(String(client.birthdayRewardLastSentYear))}</p>` : ""}
      </div>

      <button class="admin-button admin-button-small ${enabled ? "" : "admin-button-ghost"}" type="button">${enabled ? "Manage Reward" : "Set Up Reward"}</button>
    `;

    card.querySelector("button").addEventListener("click", () => openBirthdayRewardDialog(client));
    birthdayRewardsList.appendChild(card);
  });

  const allBirthdayClients = clients.filter(hasClientBirthday);
  const next30 = allBirthdayClients.filter((client) => {
    const info = getNextBirthdayInfo(client);
    return info && info.daysAway <= 30;
  }).length;
  const enabledCount = allBirthdayClients.filter((client) => client.birthdayRewardEnabled === true).length;

  birthdayNext30Count.textContent = String(next30);
  birthdayEnabledCount.textContent = String(enabledCount);
}

function getBirthdayMonthShort(client) {
  const month = Number(client?.birthdayMonth || 0);
  if (!month) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(2000, month - 1, 1));
}

function formatDeliveryLabel(value) {
  if (value === "sms") return "Text";
  if (value === "both") return "Email + text";
  return "Email";
}

function openBirthdayRewardDialog(client) {
  if (!birthdayRewardDialog || !client) return;

  const eligible = client.marketingConsent === true;
  birthdayRewardClientId.value = client.id;
  birthdayRewardClientName.textContent = `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Client";
  birthdayRewardClientMeta.textContent = [formatClientBirthday(client), client.email, client.phone]
    .filter(Boolean)
    .join("  •  ");

  birthdayRewardConsentWarning.hidden = eligible;
  birthdayRewardEnabled.disabled = !eligible;
  birthdayRewardEnabled.checked = eligible && client.birthdayRewardEnabled === true;
  birthdayRewardAmount.value = String(Number(client.birthdayRewardAmount || 25));
  birthdayRewardMinimum.value = String(Number(client.birthdayRewardMinimumSpend ?? 75));
  birthdayRewardValidDays.value = String(Number(client.birthdayRewardValidDays || 30));
  birthdayRewardDelivery.value = client.birthdayRewardDelivery || "email";
  birthdayRewardStatus.textContent = "";

  updateBirthdayRewardPreview();
  birthdayRewardDialog.showModal();
}

function updateBirthdayRewardPreview() {
  if (!birthdayRewardPreviewText) return;
  const amount = Math.max(1, Number(birthdayRewardAmount.value || 25));
  const minimum = Math.max(0, Number(birthdayRewardMinimum.value || 0));
  const validDays = Math.max(1, Number(birthdayRewardValidDays.value || 30));
  birthdayRewardPreviewText.textContent = minimum > 0
    ? `$${amount} toward a service of $${minimum} or more, valid for ${validDays} days.`
    : `$${amount} toward a service, valid for ${validDays} days.`;
}

[birthdayRewardAmount, birthdayRewardMinimum, birthdayRewardValidDays].forEach((element) => {
  element?.addEventListener("input", updateBirthdayRewardPreview);
  element?.addEventListener("change", updateBirthdayRewardPreview);
});

birthdayRewardClose?.addEventListener("click", () => birthdayRewardDialog.close());
birthdayRewardCancel?.addEventListener("click", () => birthdayRewardDialog.close());

birthdayRewardForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isAdmin) return;

  const client = clients.find((item) => item.id === birthdayRewardClientId.value);
  if (!client) return;

  const marketingEligible = client.marketingConsent === true;
  const enabled = marketingEligible && birthdayRewardEnabled.checked;
  const amount = Math.min(500, Math.max(1, Math.round(Number(birthdayRewardAmount.value || 25))));
  const minimumSpend = Math.min(2000, Math.max(0, Math.round(Number(birthdayRewardMinimum.value || 75))));
  const validDays = Math.min(365, Math.max(1, Math.round(Number(birthdayRewardValidDays.value || 30))));
  const delivery = ["email", "sms", "both"].includes(birthdayRewardDelivery.value)
    ? birthdayRewardDelivery.value
    : "email";

  birthdayRewardStatus.textContent = "Saving...";

  try {
    await updateDoc(doc(db, "clients", client.id), {
      birthdayRewardEnabled: enabled,
      birthdayRewardAmount: amount,
      birthdayRewardMinimumSpend: minimumSpend,
      birthdayRewardValidDays: validDays,
      birthdayRewardDelivery: delivery,
      birthdayRewardUpdatedAt: serverTimestamp()
    });

    Object.assign(client, {
      birthdayRewardEnabled: enabled,
      birthdayRewardAmount: amount,
      birthdayRewardMinimumSpend: minimumSpend,
      birthdayRewardValidDays: validDays,
      birthdayRewardDelivery: delivery
    });

    birthdayRewardDialog.close();
    renderBirthdayRewards();
    renderClients();
  } catch (error) {
    console.error("Birthday reward settings could not be saved:", error);
    birthdayRewardStatus.textContent = "Could not save reward settings.";
  }
});


function formatClientBirthday(client) {
  const month = Number(client?.birthdayMonth || 0);
  const day = Number(client?.birthdayDay || 0);

  if (!month || !day) return "";

  const date = new Date(2000, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";

  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(2000, month - 1, day)));

  return `${monthName} ${day}`;
}


function formatClientBirthdayKey(client) {
  const month = Number(client?.birthdayMonth || 0);
  const day = Number(client?.birthdayDay || 0);
  if (!month || !day) return "";
  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/* =============================================================
   APPOINTMENT CSV EXPORT
   =============================================================
   Appointment history is paginated in the dashboard for speed. Exporting is
   an intentional one-time action, so it fetches the complete collection only
   when an administrator explicitly requests a backup.
   ============================================================= */

async function exportAppointmentsCsv() {
  if (!isAdmin || !exportAppointmentsButton) return;

  const originalText = exportAppointmentsButton.textContent;
  exportAppointmentsButton.disabled = true;
  exportAppointmentsButton.textContent = "Preparing...";

  try {
    const snapshot = await getDocs(
      query(collection(db, "appointments"), orderBy("startAt", "desc"))
    );

    const allAppointments = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    const headers = [
      "Appointment ID",
      "Client ID",
      "Client Name",
      "Client Email",
      "Client Phone",
      "Service",
      "Start",
      "Status",
      "Internal Note",
      "Confirmation Email Sent",
      "Reminder Email Sent",
      "Created At",
      "Updated At"
    ];

    const rows = allAppointments.map((appointment) => [
      appointment.id || "",
      appointment.clientId || "",
      appointment.clientName || "",
      appointment.clientEmail || "",
      appointment.clientPhone || "",
      appointment.service || "",
      formatTimestampForExport(appointment.startAt),
      appointment.status || "scheduled",
      appointment.notes || "",
      appointment.confirmationEmailSent === true ? "Yes" : "No",
      appointment.reminderEmailSent === true ? "Yes" : "No",
      formatTimestampForExport(appointment.createdAt),
      formatTimestampForExport(appointment.updatedAt)
    ]);

    downloadCsv(
      [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))].join("\r\n"),
      `genetik-bleu-appointments-${new Date().toISOString().slice(0, 10)}.csv`
    );
  } catch (error) {
    console.error("Appointment export failed:", error);
    window.alert("The appointment export could not be created. Please try again.");
  } finally {
    exportAppointmentsButton.disabled = false;
    exportAppointmentsButton.textContent = originalText;
  }
}

function downloadCsv(csv, filename) {
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =============================================================
   CLIENT DIRECTORY CSV EXPORT
   ============================================================= */

function exportClientsCsv() {
  if (!isAdmin || clients.length === 0) return;

  const headers = [
    "Client ID",
    "First Name",
    "Last Name",
    "Phone",
    "Email",
    "Birthday",
    "Birthday Key",
    "Birthday Marketing Eligible",
    "Birthday Reward Enabled",
    "Birthday Reward Amount",
    "Birthday Reward Minimum Spend",
    "Birthday Reward Valid Days",
    "Birthday Reward Delivery",
    "Registered At",
    "Service Communications Consent",
    "Marketing Consent",
    "Consent Recorded At",
    "Client Note"
  ];

  const rows = clients.map((client) => [
    client.id || "",
    client.firstName || "",
    client.lastName || "",
    client.phone || "",
    client.email || "",
    formatClientBirthday(client),
    formatClientBirthdayKey(client),
    client.birthdayMonth && client.birthdayDay && client.marketingConsent === true ? "Yes" : "No",
    client.birthdayRewardEnabled === true ? "Yes" : "No",
    client.birthdayRewardAmount || "",
    client.birthdayRewardMinimumSpend ?? "",
    client.birthdayRewardValidDays || "",
    client.birthdayRewardDelivery || "",
    formatTimestampForExport(client.createdAt),
    client.serviceCommunicationsConsent === true ? "Yes" : "No",
    client.marketingConsent === true ? "Yes" : "No",
    formatTimestampForExport(client.consentAt),
    client.clientNote || client.note || ""
  ]);

  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(","))
  ].join("\r\n");

  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `genetik-bleu-clients-${today}.csv`);
}


/* =============================================================
   CLIENT DIRECTORY PDF EXPORT
   =============================================================
   Creates the PDF completely in the browser. No client information is sent
   to a PDF service or third-party library.
   ============================================================= */

function exportClientsPdf() {
  if (!isAdmin || clients.length === 0 || !exportClientsPdfButton) return;

  const originalLabel = exportClientsPdfButton.querySelector("span")?.textContent || "Export PDF";
  exportClientsPdfButton.disabled = true;

  const label = exportClientsPdfButton.querySelector("span");
  if (label) label.textContent = "Preparing...";

  try {
    const sortedClients = [...clients].sort((a, b) => {
      const aName = `${a.lastName || ""} ${a.firstName || ""}`.trim();
      const bName = `${b.lastName || ""} ${b.firstName || ""}`.trim();
      return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });

    const pdfBytes = buildClientDirectoryPdf(sortedClients);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `genetik-bleu-client-directory-${today}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (error) {
    console.error("Client PDF export failed:", error);
    alert("The PDF could not be created. Please try again.");
  } finally {
    exportClientsPdfButton.disabled = clients.length === 0;
    if (label) label.textContent = originalLabel;
  }
}

function buildClientDirectoryPdf(clientRecords) {
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const LEFT = 42;
  const RIGHT = 570;
  const TOP = 742;
  const BOTTOM = 48;

  const pages = [];
  let commands = [];
  let y = TOP;

  function addText(text, x, yPosition, size = 9, bold = false, gray = 0.15) {
    const clean = pdfEscapeText(text);
    commands.push(
      `BT ${gray} g /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${yPosition} Tm (${clean}) Tj ET`
    );
  }

  function addLine(yPosition) {
    commands.push(`0.86 G 0.6 w ${LEFT} ${yPosition} m ${RIGHT} ${yPosition} l S`);
  }

  function addPageHeader() {
    addText("Genetik Bleu Salon", LEFT, 748, 17, true, 0.10);
    addText("Client Directory", LEFT, 728, 10, true, 0.30);

    const exported = new Date().toLocaleString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });

    addText(
      `Exported ${exported}  |  ${clientRecords.length} client${clientRecords.length === 1 ? "" : "s"}`,
      LEFT,
      711,
      7.5,
      false,
      0.45
    );

    addLine(700);
    y = 680;
  }

  function finishPage() {
    pages.push(commands.join("\n"));
    commands = [];
    addPageHeader();
  }

  function ensureSpace(heightNeeded) {
    if (y - heightNeeded < BOTTOM) {
      finishPage();
    }
  }

  addPageHeader();

  clientRecords.forEach((client, index) => {
    const fullName =
      `${client.firstName || ""} ${client.lastName || ""}`.trim() || "Unnamed Client";

    const contactParts = [];
    if (client.phone) contactParts.push(`Phone: ${client.phone}`);
    if (client.email) contactParts.push(`Email: ${client.email}`);

    const detailParts = [];
    const birthday = formatClientBirthday(client);
    if (birthday && birthday !== "—") detailParts.push(`Birthday: ${birthday}`);
    detailParts.push(`Marketing: ${client.marketingConsent === true ? "Opted in" : "Not opted in"}`);

    const rewardParts = [];
    if (client.birthdayRewardEnabled === true) {
      const amount = Number(client.birthdayRewardAmount || 0);
      const minimum = Number(client.birthdayRewardMinimumSpend || 0);
      const validDays = Number(client.birthdayRewardValidDays || 0);
      const delivery = client.birthdayRewardDelivery || "email";

      rewardParts.push(
        `Birthday reward: $${amount || 0}` +
        `${minimum > 0 ? ` toward $${minimum}+ service` : ""}` +
        `${validDays > 0 ? ` | ${validDays} days` : ""}` +
        ` | ${delivery}`
      );
    }

    const registration = formatTimestampForExport(client.createdAt);
    if (registration) detailParts.push(`Registered: ${registration}`);

    const note = (client.clientNote || client.note || "").trim();
    const noteLines = note ? wrapPdfText(`Note: ${note}`, 92) : [];

    const contactLines = wrapPdfText(contactParts.join("   |   "), 95);
    const detailsLines = wrapPdfText(detailParts.join("   |   "), 95);
    const rewardLines = rewardParts.length ? wrapPdfText(rewardParts.join(""), 95) : [];

    const blockHeight =
      20 +
      contactLines.length * 12 +
      detailsLines.length * 12 +
      rewardLines.length * 12 +
      noteLines.length * 12 +
      16;

    ensureSpace(Math.max(blockHeight, 58));

    addText(fullName, LEFT, y, 11, true, 0.10);
    y -= 16;

    contactLines.forEach((line) => {
      addText(line, LEFT, y, 8.5, false, 0.25);
      y -= 12;
    });

    detailsLines.forEach((line) => {
      addText(line, LEFT, y, 8, false, 0.36);
      y -= 12;
    });

    rewardLines.forEach((line) => {
      addText(line, LEFT, y, 8, true, 0.28);
      y -= 12;
    });

    noteLines.forEach((line) => {
      addText(line, LEFT, y, 8, false, 0.32);
      y -= 12;
    });

    y -= 5;
    addLine(y);
    y -= 14;
  });

  pages.push(commands.join("\n"));

  return assembleSimplePdf(pages, PAGE_WIDTH, PAGE_HEIGHT);
}

function wrapPdfText(value, maxChars = 92) {
  const text = normalizePdfText(value).replace(/\s+/g, " ").trim();
  if (!text) return [];

  const words = text.split(" ");
  const lines = [];
  let line = "";

  words.forEach((word) => {
    if (word.length > maxChars) {
      if (line) {
        lines.push(line);
        line = "";
      }

      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars));
      }
      return;
    }

    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length <= maxChars) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function normalizePdfText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}

function pdfEscapeText(value) {
  return normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function assembleSimplePdf(pageStreams, pageWidth, pageHeight) {
  const encoder = new TextEncoder();
  const objects = [];

  // Object 1: catalog
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";

  // Objects 3 and 4: built-in fonts
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";

  const pageRefs = [];

  pageStreams.forEach((stream, index) => {
    const pageObjectNumber = 5 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);

    objects[pageObjectNumber] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> ` +
      `/Contents ${contentObjectNumber} 0 R >>`;

    const streamLength = encoder.encode(stream).length;
    objects[contentObjectNumber] =
      `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`;
  });

  // Object 2 depends on the final page list.
  objects[2] =
    `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pageRefs.length} >>`;

  const header = "%PDF-1.4\n%GBPDF\n";
  let pdf = header;
  const offsets = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = encoder.encode(pdf).length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  pdf +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

function csvCell(value) {
  let text = String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Prevent spreadsheet software from treating client-entered text as a formula.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

function formatTimestampForExport(value) {
  if (!value?.toDate) return "";

  const date = value.toDate();
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit"
  });
}

function toMillis(value) {
  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return 0;
}

function formatTimestamp(value) {
  if (!value?.toDate) return "recently";
  return value.toDate().toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(value) {
  if (!value?.toDate) return "—";
  return value.toDate().toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function timestampToLocalDate(value) {
  const date = value?.toDate ? value.toDate() : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
