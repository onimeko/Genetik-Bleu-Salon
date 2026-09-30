/* =============================================================
   GENETIK BLEU SALON - CLIENT REGISTRATION -> CLOUD FIRESTORE
   =============================================================

   This file uses Firebase's modern modular JavaScript API.
   It saves:
     - firstName
     - lastName
     - email
     - phone
     - birthdayMonth / birthdayDay (optional; month/day only)
     - serviceCommunicationsConsent (required true)
     - marketingConsent (optional true/false)
     - consentAt (automatic server timestamp)
     - createdAt (automatic server timestamp)

   The public website NEVER reads the clients collection.
   Firestore Security Rules should allow CREATE only and deny public reads.
   ============================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  doc,
  getFirestore,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#client-registration-form");
const submitButton = document.querySelector("#registration-submit");
const statusMessage = document.querySelector("#registration-status");
const successDialog = document.querySelector("#registration-success-dialog");
const successDialogMessage = document.querySelector("#registration-success-message");
const successDialogClose = document.querySelector("#registration-success-close");
const birthdayMonthSelect = document.querySelector("#birthday-month");
const birthdayDaySelect = document.querySelector("#birthday-day");
const serviceConsentInput = document.querySelector("#service-communications-consent");
const serviceConsentDetails = document.querySelector("#service-consent-details");
const marketingConsentDetails = document.querySelector("#marketing-consent-details");

// Quiet anti-spam safeguards. These do not change the visible form.
const MINIMUM_FORM_TIME_MS = 1800;
const SUCCESS_COOLDOWN_MS = 60 * 1000;
const LAST_SUCCESS_KEY = "genetikBleuRegistrationLastSuccess";
const formOpenedAt = performance.now();


const BIRTHDAY_MONTH_NAMES = [
  "",
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

if (birthdayMonthSelect && birthdayDaySelect) {
  birthdayMonthSelect.addEventListener("change", () => {
    populateBirthdayDays(birthdayMonthSelect.value, birthdayDaySelect.value);
  });

  populateBirthdayDays(birthdayMonthSelect.value, birthdayDaySelect.value);
}

if (serviceConsentInput && serviceConsentDetails) {
  // If someone tries to submit without the required consent, reveal the
  // collapsed terms so the checkbox and explanation are immediately visible.
  serviceConsentInput.addEventListener("invalid", () => {
    serviceConsentDetails.open = true;
  });
}

if (successDialog && successDialogClose) {
  successDialogClose.addEventListener("click", () => {
    if (typeof successDialog.close === "function") {
      successDialog.close();
    } else {
      successDialog.removeAttribute("open");
    }
  });

  successDialog.addEventListener("click", (event) => {
    if (event.target === successDialog) {
      if (typeof successDialog.close === "function") {
        successDialog.close();
      } else {
        successDialog.removeAttribute("open");
      }
    }
  });
}

if (form && submitButton && statusMessage) {
  const configStillHasPlaceholders = Object.values(firebaseConfig).some((value) =>
    String(value).includes("PASTE_YOUR_")
  );

  if (configStillHasPlaceholders) {
    statusMessage.textContent =
      "Firebase is not connected yet. Add your Firebase web configuration to firebase-config.js.";
    statusMessage.classList.add("is-error");
  } else {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      // Honeypot: bots often fill hidden fields. Real visitors never see it.
      // Silently discard the request so the trap does not teach a bot what failed.
      if (form.website.value.trim() !== "") {
        form.reset();
        return;
      }

      // Very fast automated submissions are common with basic form bots.
      // A normal visitor will almost always take longer than this to review/fill the form.
      if (performance.now() - formOpenedAt < MINIMUM_FORM_TIME_MS) {
        showStatus("Please take a moment to review your information, then submit again.", true);
        return;
      }

      // Prevent repeated submissions from the same browser immediately after success.
      const lastSuccess = getLastSuccessfulRegistration();
      if (lastSuccess && Date.now() - lastSuccess < SUCCESS_COOLDOWN_MS) {
        showStatus("Your registration was just received. Please wait a moment before submitting again.", false, true);
        return;
      }

      const firstName = cleanText(form.first_name.value);
      const lastName = cleanText(form.last_name.value);
      const email = form.email.value.trim().toLowerCase();
      const phone = cleanText(form.phone.value);
      const birthdayMonth = Number(form.birthday_month?.value || 0);
      const birthdayDay = Number(form.birthday_day?.value || 0);
      const serviceCommunicationsConsent = form.service_communications_consent.checked;
      const marketingConsent = form.marketing_consent.checked;

      if (!firstName || !lastName || !email || !phone) {
        showStatus("Please complete all four contact fields.", true);
        return;
      }

      if (!isReasonableName(firstName) || !isReasonableName(lastName)) {
        showStatus("Please enter your name without website links or unusual symbols.", true);
        return;
      }

      if (!isReasonableEmail(email)) {
        showStatus("Please enter a valid email address.", true);
        return;
      }

      if (!isReasonablePhone(phone)) {
        showStatus("Please enter a valid phone number.", true);
        return;
      }

      const birthdayValidation = validateBirthday(birthdayMonth, birthdayDay);
      if (!birthdayValidation.valid) {
        showStatus(birthdayValidation.message, true);
        return;
      }

      // The client must actively agree to service-related communications.
      // Promotional/marketing consent remains optional.
      if (!serviceCommunicationsConsent) {
        showStatus("Please check the required service-communications box before submitting your registration.", true);
        return;
      }

      // Extra client-side limits that match the Firestore rules in firestore.rules.
      if (firstName.length > 60 || lastName.length > 60 || email.length > 254 || phone.length > 30) {
        showStatus("One or more fields are too long. Please check your information.", true);
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
      showStatus("Saving your information...", false);

      try {
        // Stable privacy-preserving ID for this registration.
        // Firestore rules allow public CREATE but not public UPDATE. Therefore,
        // an identical name/email/phone submission cannot keep creating duplicates.
        const registrationId = await createRegistrationId({
          firstName,
          lastName,
          email,
          phone
        });

        await setDoc(doc(db, "clients", registrationId), {
          firstName,
          lastName,
          email,
          phone,
          birthdayMonth,
          birthdayDay,
          serviceCommunicationsConsent: true,
          marketingConsent,
          consentAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });

        rememberSuccessfulRegistration();

        // The submitted first name is retained briefly to personalize the
        // confirmation, then clear the form so no personal data is left behind.
        const confirmationName = firstName;
        form.reset();

        // Optional birthday and consent controls return
        // to their clean default state after a successful registration.
        populateBirthdayDays("", "");
        if (serviceConsentDetails) serviceConsentDetails.open = false;
        if (marketingConsentDetails) marketingConsentDetails.open = false;

        showStatus("Registration complete.", false, true);
        showRegistrationSuccess(confirmationName);
      } catch (error) {
        console.error("Client registration failed:", error);

        if (error?.code === "permission-denied") {
          showStatus(
            "We could not add another copy of this registration. If you have already registered, you are all set. If you need to change your information, please call the salon.",
            true
          );
        } else {
          showStatus(
            "We could not save your information right now. Please try again or call the salon.",
            true
          );
        }
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Add Me to the Client List";
      }
    });
  }
}


function populateBirthdayDays(monthValue, selectedDay = "") {
  if (!birthdayDaySelect) return;

  const month = Number(monthValue || 0);
  const previousDay = Number(selectedDay || 0);

  birthdayDaySelect.innerHTML = '<option value="">Day</option>';

  if (!month) {
    birthdayDaySelect.disabled = true;
    return;
  }

  // Year 2000 is used intentionally so February 29 remains available.
  const daysInMonth = new Date(2000, month, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const option = document.createElement("option");
    option.value = String(day);
    option.textContent = String(day);
    if (day === previousDay) option.selected = true;
    birthdayDaySelect.appendChild(option);
  }

  birthdayDaySelect.disabled = false;
}

function validateBirthday(month, day) {
  if (!month && !day) {
    return { valid: true, message: "" };
  }

  if (!month || !day) {
    return {
      valid: false,
      message: "Please choose both a birthday month and day, or leave the birthday section blank."
    };
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { valid: false, message: "Please choose a valid birthday month." };
  }

  const daysInMonth = new Date(2000, month, 0).getDate();
  if (!Number.isInteger(day) || day < 1 || day > daysInMonth) {
    return { valid: false, message: "Please choose a valid birthday day." };
  }

  return { valid: true, message: "" };
}

function cleanText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function isReasonableName(value) {
  if (!value || value.length > 60) return false;
  if (/[<>]/.test(value)) return false;
  if (/(https?:\/\/|www\.)/i.test(value)) return false;
  return true;
}

function isReasonableEmail(value) {
  if (!value || value.length > 254 || /\s/.test(value)) return false;
  return /^[^@]+@[^@]+\.[^@]+$/.test(value);
}

function isReasonablePhone(value) {
  if (!value || value.length > 30) return false;
  if (!/^[0-9+().\-\s]+$/.test(value)) return false;

  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

async function createRegistrationId({ firstName, lastName, email, phone }) {
  const normalizedPhone = phone.replace(/\D/g, "");
  const signature = [
    firstName.toLowerCase(),
    lastName.toLowerCase(),
    email.toLowerCase(),
    normalizedPhone
  ].join("|");

  const bytes = new TextEncoder().encode(signature);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return `client_${hex.slice(0, 40)}`;
}

function getLastSuccessfulRegistration() {
  try {
    const value = window.localStorage.getItem(LAST_SUCCESS_KEY);
    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  } catch {
    return 0;
  }
}

function rememberSuccessfulRegistration() {
  try {
    window.localStorage.setItem(LAST_SUCCESS_KEY, String(Date.now()));
  } catch {
    // Registration should still succeed if browser storage is unavailable.
  }
}

function showStatus(message, isError = false, isSuccess = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
  statusMessage.classList.toggle("is-success", isSuccess);
}


function showRegistrationSuccess(firstName) {
  if (!successDialog || !successDialogMessage) return;

  successDialogMessage.textContent = firstName
    ? `Thank you, ${firstName}. Your information was received successfully.`
    : "Your information was received successfully.";

  if (typeof successDialog.showModal === "function") {
    if (!successDialog.open) {
      successDialog.showModal();
    }
  } else {
    successDialog.setAttribute("open", "");
  }

  window.setTimeout(() => {
    successDialogClose?.focus();
  }, 50);
}
