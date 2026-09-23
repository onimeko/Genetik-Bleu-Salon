/* =============================================================
   GENETIK BLEU SALON - CLIENT REGISTRATION -> CLOUD FIRESTORE
   =============================================================

   This file uses Firebase's modern modular JavaScript API.
   It saves:
     - firstName
     - lastName
     - email
     - phone
     - marketingConsent (required true)
     - consentAt (automatic server timestamp)
     - createdAt (automatic server timestamp)

   The public website NEVER reads the clients collection.
   Firestore Security Rules should allow CREATE only and deny public reads.
   ============================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const form = document.querySelector("#client-registration-form");
const submitButton = document.querySelector("#registration-submit");
const statusMessage = document.querySelector("#registration-status");

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

      // Honeypot: bots often fill hidden fields. Silently ignore those submissions.
      if (form.website.value.trim() !== "") {
        form.reset();
        return;
      }

      const firstName = cleanText(form.first_name.value);
      const lastName = cleanText(form.last_name.value);
      const email = form.email.value.trim().toLowerCase();
      const phone = form.phone.value.trim();
      const marketingConsent = form.marketing_consent.checked;

      if (!firstName || !lastName || !email || !phone) {
        showStatus("Please complete all four contact fields.", true);
        return;
      }

      // The client must actively agree before the record can be created.
      if (!marketingConsent) {
        showStatus("Please check the consent box before submitting your registration.", true);
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
        await addDoc(collection(db, "clients"), {
          firstName,
          lastName,
          email,
          phone,
          marketingConsent: true,
          consentAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });

        form.reset();
        showStatus("Thank you. You have been added to the Genetik Bleu client list.", false, true);
      } catch (error) {
        console.error("Client registration failed:", error);
        showStatus(
          "We could not save your information right now. Please try again or call the salon.",
          true
        );
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Add Me to the Client List";
      }
    });
  }
}

function cleanText(value) {
  return value.trim().replace(/\s+/g, " ");
}

function showStatus(message, isError = false, isSuccess = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("is-error", isError);
  statusMessage.classList.toggle("is-success", isSuccess);
}
