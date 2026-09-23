/* =============================================================
   GENETIK BLEU — PUBLIC CLIENT REGISTRATION
   =============================================================
   Only CREATE client records in Firestore; public visitors never read them.
   Appointment delivery is not implemented here. Server-side messaging,
   once enabled, must use these stored preferences AND explicit SMS opt-in.
   ============================================================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { addDoc, collection, getFirestore, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#client-registration-form");
const submitButton = document.querySelector("#registration-submit");
const statusMessage = document.querySelector("#registration-status");
const smsConsentField = document.querySelector("#sms-consent-field");
const smsConsent = document.querySelector("#sms-consent");
const preferenceRadios = [...document.querySelectorAll('input[name="communication_preference"]')];
const PREFERENCE_VALUES = ["email", "sms", "both", "none"];
const CONSENT_VERSION = "2026-09-v1";

function selectedPreference() {
  return preferenceRadios.find((radio) => radio.checked)?.value || "";
}

function syncSmsOptIn() {
  const wantsSms = ["sms", "both"].includes(selectedPreference());
  smsConsentField.hidden = !wantsSms;
  smsConsent.required = wantsSms;
  if (!wantsSms) smsConsent.checked = false;
}

preferenceRadios.forEach((radio) => radio.addEventListener("change", syncSmsOptIn));
syncSmsOptIn();

if (form && submitButton && statusMessage) {
  const placeholdersRemain = Object.values(firebaseConfig).some((value) =>
    String(value).includes("PASTE_YOUR_")
  );
  if (placeholdersRemain) {
    showStatus("Firebase is not connected. Contact the salon to register.", true);
    submitButton.disabled = true;
  } else {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.website.value.trim()) { form.reset(); syncSmsOptIn(); return; }

      const firstName = cleanText(form.first_name.value);
      const lastName = cleanText(form.last_name.value);
      const email = form.email.value.trim().toLowerCase();
      const phone = form.phone.value.trim();
      const communicationPreference = selectedPreference();
      const wantsSms = ["sms", "both"].includes(communicationPreference);
      const explicitSmsOptIn = wantsSms && smsConsent.checked;
      const directoryConsent = form.directory_consent.checked;
      const emailMarketingConsent = form.email_marketing_consent.checked;

      if (!firstName || !lastName || !email || !phone) {
        showStatus("Please complete all four contact fields.", true); return;
      }
      if (firstName.length > 60 || lastName.length > 60 || email.length > 254 || phone.length > 30) {
        showStatus("One or more fields are too long. Please check your information.", true); return;
      }
      if (!PREFERENCE_VALUES.includes(communicationPreference)) {
        showStatus("Please select how you would like to receive appointment updates.", true); return;
      }
      if (!directoryConsent) {
        showStatus("Please agree to join the client directory to register.", true); return;
      }
      if (wantsSms && !explicitSmsOptIn) {
        showStatus("Please check the separate appointment-text consent box, or choose a different update preference.", true);
        smsConsent.focus(); return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
      showStatus("Saving your information...");
      try {
        await addDoc(collection(db, "clients"), {
          firstName, lastName, email, phone,
          status: "active",
          directoryConsent: true,
          communicationPreference,
          smsConsent: explicitSmsOptIn,
          smsConsentAt: explicitSmsOptIn ? serverTimestamp() : null,
          emailMarketingConsent,
          consentVersion: CONSENT_VERSION,
          consentAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        form.reset();
        syncSmsOptIn();
        showStatus("Thank you. Your registration and communication preferences have been saved.", false, true);
      } catch (error) {
        console.error("Client registration failed:", error?.code || "unknown error");
        showStatus("We could not save your information right now. Please try again or call the salon.", true);
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Add Me to the Client List";
      }
    });
  }
}

function cleanText(value) { return value.trim().replace(/\s+/g, " "); }
function showStatus(message, isError = false, isSuccess = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
  statusMessage.classList.toggle("is-success", isSuccess);
}
