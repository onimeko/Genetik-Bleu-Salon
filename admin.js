/* =============================================================
   GENETIK BLEU - PRIVATE CLIENT + APPOINTMENT MANAGER
   =============================================================
   PHASE 2:
   - Google Authentication is active.
   - Firestore controls access through /admins/{uid} documents.
   - This page can display the signed-in user's UID even BEFORE they
     are approved, which makes the one-time admin setup easy.
   - Email/SMS sending is intentionally NOT active yet.
   ============================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

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
const newAppointmentButton = document.querySelector("#new-appointment-button");
const appointmentDialog = document.querySelector("#appointment-dialog");
const appointmentForm = document.querySelector("#appointment-form");
const appointmentClient = document.querySelector("#appointment-client");
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

let clients = [];
let appointments = [];
let currentUser = null;
let isAdmin = false;

// Finish a mobile/tablet redirect sign-in if one just returned to this page.
getRedirectResult(auth).catch((error) => {
  console.error("Redirect sign-in failed:", error);
  showAuthError(error);
});

signInButton.addEventListener("click", async () => {
  authStatus.textContent = "Opening Google sign-in...";
  try {
    // Redirect is generally smoother on phones/tablets. Popup is convenient on desktop.
    if (window.matchMedia("(max-width: 1024px)").matches) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
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
    message = "This website domain is not authorized in Firebase Authentication yet. Add this domain under Authentication → Settings → Authorized domains.";
  } else if (error?.code === "auth/popup-blocked") {
    message = "The browser blocked the sign-in popup. Allow popups for this site and try again.";
  }
  authStatus.textContent = message;
  authStatus.classList.add("is-error");
}

async function loadDashboard() {
  await Promise.all([loadClients(), loadAppointments()]);
  populateClientSelect();
  renderClients();
  renderAppointments();
  updateCounts();
}

async function loadClients() {
  const snapshot = await getDocs(collection(db, "clients"));
  clients = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  clients.sort((a, b) =>
    `${a.lastName || ""} ${a.firstName || ""}`.localeCompare(`${b.lastName || ""} ${b.firstName || ""}`, undefined, { sensitivity: "base" })
  );
}

async function loadAppointments() {
  const snapshot = await getDocs(collection(db, "appointments"));
  appointments = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  appointments.sort((a, b) => toMillis(a.startAt) - toMillis(b.startAt));
}

function updateCounts() {
  clientCount.textContent = String(clients.length);
  const now = Date.now();
  const upcoming = appointments.filter((a) => toMillis(a.startAt) >= now && a.status !== "cancelled").length;
  upcomingCount.textContent = String(upcoming);
}

function renderClients() {
  const term = clientSearch.value.trim().toLowerCase();
  const filtered = clients.filter((client) => {
    const haystack = `${client.firstName || ""} ${client.lastName || ""} ${client.email || ""} ${client.phone || ""}`.toLowerCase();
    return haystack.includes(term);
  });

  clientsList.innerHTML = "";
  clientsEmpty.hidden = filtered.length !== 0;

  filtered.forEach((client) => {
    const row = document.createElement("article");
    row.className = "client-row";
    row.innerHTML = `
      <div>
        <span class="row-label">Client</span>
        <h4>${escapeHtml(client.lastName || "")}, ${escapeHtml(client.firstName || "")}</h4>
        <p>Registered ${formatTimestamp(client.createdAt)}</p>
      </div>
      <div>
        <span class="row-label">Phone</span>
        <p>${escapeHtml(client.phone || "—")}</p>
      </div>
      <div>
        <span class="row-label">Email</span>
        <p>${escapeHtml(client.email || "—")}</p>
      </div>
      <button class="admin-button admin-button-small" type="button">Add Appointment</button>
    `;
    row.querySelector("button").addEventListener("click", () => openAppointmentDialog(null, client.id));
    clientsList.appendChild(row);
  });
}

function renderAppointments() {
  appointmentsList.innerHTML = "";
  appointmentsEmpty.hidden = appointments.length !== 0;

  appointments.forEach((appointment) => {
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
        <p><span class="status-pill">${escapeHtml(appointment.status || "scheduled")}</span></p>
      </div>
      <button class="admin-button admin-button-small admin-button-ghost" type="button">Edit</button>
    `;
    row.querySelector("button").addEventListener("click", () => openAppointmentDialog(appointment));
    appointmentsList.appendChild(row);
  });
}

clientSearch.addEventListener("input", renderClients);

document.querySelectorAll(".admin-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((tab) => tab.classList.toggle("is-active", tab === button));
    document.querySelectorAll(".admin-panel").forEach((panel) => panel.classList.remove("is-active"));
    document.querySelector(`#${button.dataset.tab}-panel`).classList.add("is-active");
  });
});

newAppointmentButton.addEventListener("click", () => openAppointmentDialog());
appointmentCancel.addEventListener("click", () => appointmentDialog.close());
appointmentClose.addEventListener("click", () => appointmentDialog.close());

function populateClientSelect() {
  appointmentClient.innerHTML = '<option value="">Choose a client</option>';
  clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = `${client.lastName || ""}, ${client.firstName || ""}`;
    appointmentClient.appendChild(option);
  });
}

function openAppointmentDialog(appointment = null, preselectedClientId = "") {
  appointmentForm.reset();
  appointmentStatusMessage.textContent = "";
  appointmentId.value = appointment?.id || "";
  appointmentDelete.hidden = !appointment;
  appointmentDialogTitle.textContent = appointment ? "Edit Appointment" : "Add Appointment";

  if (appointment) {
    appointmentClient.value = appointment.clientId || "";
    const date = timestampToLocalDate(appointment.startAt);
    appointmentDate.value = date.date;
    appointmentTime.value = date.time;
    appointmentService.value = appointment.service || "";
    appointmentStatus.value = appointment.status || "scheduled";
    appointmentNotes.value = appointment.notes || "";
  } else {
    appointmentClient.value = preselectedClientId;
    appointmentStatus.value = "scheduled";
  }

  appointmentDialog.showModal();
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
