"use strict";

/* =============================================================
   GENETIK BLEU — APPOINTMENT EMAIL AUTOMATION
   =============================================================
   Sends:
   1) an immediate appointment confirmation after a new appointment
   2) an updated confirmation if client/service/date/time is changed
   3) an automatic reminder approximately 24 hours before the appointment

   Email delivery uses Brevo's transactional email API.
   The Brevo API key is stored in Firebase Secret Manager — never in
   browser JavaScript and never in this repository.
   ============================================================= */

const crypto = require("node:crypto");

const { initializeApp } = require("firebase-admin/app");
const {
  FieldValue,
  Timestamp,
  getFirestore
} = require("firebase-admin/firestore");

const {
  onDocumentCreated,
  onDocumentUpdated
} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const {
  defineInt,
  defineSecret,
  defineString
} = require("firebase-functions/params");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

const BREVO_API_KEY = defineSecret("BREVO_API_KEY");
const EMAIL_SENDER_ADDRESS = defineString("EMAIL_SENDER_ADDRESS");
const REMINDER_HOURS_BEFORE = defineInt("REMINDER_HOURS_BEFORE", {
  default: 24
});

const REGION = "us-central1";
const TIME_ZONE = "America/Chicago";
const SALON_NAME = "Genetik Bleu Salon";
const SALON_ADDRESS = "8452 S Stony Island Ave, Chicago, IL 60617";
const SALON_PHONE = "(773) 359-2491";
const ACTIVE_STATUSES = new Set(["scheduled", "confirmed"]);

function isActiveAppointment(appointment) {
  return ACTIVE_STATUSES.has(appointment?.status || "scheduled");
}

function validEmail(value) {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim())
  );
}

function timestampMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.toDate === "function") return value.toDate().getTime();
  return 0;
}

function appointmentDetailsChanged(before, after) {
  return (
    (before.clientId || "") !== (after.clientId || "") ||
    (before.clientName || "").trim() !== (after.clientName || "").trim() ||
    (before.clientEmail || "").trim().toLowerCase() !==
      (after.clientEmail || "").trim().toLowerCase() ||
    (before.service || "").trim() !== (after.service || "").trim() ||
    timestampMillis(before.startAt) !== timestampMillis(after.startAt)
  );
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function appointmentDateParts(startAt) {
  const date = startAt.toDate();

  const dateText = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(date);

  const timeText = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit"
  }).format(date);

  return { dateText, timeText };
}

function deterministicUuid(input) {
  const bytes = crypto.createHash("sha256").update(input).digest().subarray(0, 16);

  // Deterministic bytes are formatted as an RFC-4122-style UUID so Brevo can
  // use the value as an idempotency key during short retry windows.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20)
  ].join("-");
}

function buildAppointmentEmail(appointment, kind) {
  const { dateText, timeText } = appointmentDateParts(appointment.startAt);
  const clientName = (appointment.clientName || "Client").trim();
  const safeName = htmlEscape(clientName);
  const safeService = htmlEscape(appointment.service || "Salon appointment");
  const safeDate = htmlEscape(dateText);
  const safeTime = htmlEscape(timeText);

  let subject;
  let eyebrow;
  let heading;
  let intro;

  if (kind === "reminder") {
    subject = `Reminder: your ${SALON_NAME} appointment is tomorrow`;
    eyebrow = "Appointment Reminder";
    heading = "We’ll see you tomorrow.";
    intro = `This is a reminder for your upcoming appointment with Marni at ${SALON_NAME}.`;
  } else if (kind === "update") {
    subject = `Your ${SALON_NAME} appointment was updated`;
    eyebrow = "Appointment Updated";
    heading = "Your appointment details have been updated.";
    intro = `Here are the latest details for your appointment with Marni at ${SALON_NAME}.`;
  } else {
    subject = `Your ${SALON_NAME} appointment is scheduled`;
    eyebrow = "Appointment Confirmation";
    heading = "Your appointment is on the calendar.";
    intro = `Your appointment with Marni at ${SALON_NAME} has been scheduled.`;
  }

  const textContent = [
    `Hi ${clientName},`,
    "",
    intro,
    "",
    `Service: ${appointment.service || "Salon appointment"}`,
    `Date: ${dateText}`,
    `Time: ${timeText}`,
    `Location: ${SALON_ADDRESS}`,
    "",
    `If you need to make a change, please call Marni during shop hours at ${SALON_PHONE}.`,
    "",
    "This is a service-related appointment message from Genetik Bleu Salon."
  ].join("\n");

  const htmlContent = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f3eee7;font-family:Arial,Helvetica,sans-serif;color:#24201e;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3eee7;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf9;border:1px solid #ded6cc;">
            <tr>
              <td style="padding:38px 36px 18px;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;color:#62728a;">${eyebrow}</div>
                <h1 style="margin:10px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.08;font-weight:400;color:#201d1b;">${heading}</h1>
                <p style="margin:0;font-size:16px;line-height:1.7;color:#665f5a;">Hi ${safeName}, ${htmlEscape(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 36px 22px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #ded6cc;border-bottom:1px solid #ded6cc;">
                  <tr>
                    <td style="padding:16px 0;width:34%;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#77706b;">Service</td>
                    <td style="padding:16px 0;font-size:16px;color:#24201e;">${safeService}</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0;border-top:1px solid #ece6df;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#77706b;">Date</td>
                    <td style="padding:16px 0;border-top:1px solid #ece6df;font-size:16px;color:#24201e;">${safeDate}</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0;border-top:1px solid #ece6df;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#77706b;">Time</td>
                    <td style="padding:16px 0;border-top:1px solid #ece6df;font-size:16px;color:#24201e;">${safeTime}</td>
                  </tr>
                  <tr>
                    <td style="padding:16px 0;border-top:1px solid #ece6df;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;font-weight:700;color:#77706b;">Location</td>
                    <td style="padding:16px 0;border-top:1px solid #ece6df;font-size:16px;line-height:1.5;color:#24201e;">${SALON_ADDRESS}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 36px 38px;">
                <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#665f5a;">Need to make a change? Call Marni during shop hours at <strong>${SALON_PHONE}</strong>.</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#8b837d;">This is a service-related appointment message from ${SALON_NAME}.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, textContent, htmlContent };
}

async function sendBrevoEmail({
  appointmentId,
  appointment,
  kind
}) {
  const toEmail = (appointment.clientEmail || "").trim().toLowerCase();

  if (!validEmail(toEmail)) {
    throw new Error("Appointment does not contain a valid client email address.");
  }

  const senderEmail = EMAIL_SENDER_ADDRESS.value().trim().toLowerCase();
  if (!validEmail(senderEmail)) {
    throw new Error("EMAIL_SENDER_ADDRESS is not a valid email address.");
  }

  const startMillis = timestampMillis(appointment.startAt);
  const idempotencyKey = deterministicUuid(
    `${appointmentId}|${kind}|${startMillis}|${toEmail}|${appointment.service || ""}`
  );

  const email = buildAppointmentEmail(appointment, kind);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": BREVO_API_KEY.value(),
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: {
        name: SALON_NAME,
        email: senderEmail
      },
      replyTo: {
        name: SALON_NAME,
        email: senderEmail
      },
      to: [
        {
          email: toEmail,
          name: appointment.clientName || undefined
        }
      ],
      subject: email.subject,
      textContent: email.textContent,
      htmlContent: email.htmlContent,
      headers: {
        "Idempotency-Key": idempotencyKey
      },
      tags: ["genetik-bleu", `appointment-${kind}`]
    })
  });

  const raw = await response.text();
  let result = {};

  try {
    result = raw ? JSON.parse(raw) : {};
  } catch {
    result = { raw };
  }

  // Brevo treats a repeated idempotency key as a duplicate request. That means
  // the original request was already accepted, so we can safely mark it sent.
  if (
    !response.ok &&
    result?.code !== "duplicate_parameter"
  ) {
    throw new Error(
      `Brevo email request failed (${response.status}): ${
        result?.message || raw || "Unknown error"
      }`
    );
  }

  return {
    messageId: result?.messageId || "",
    duplicateProtected: result?.code === "duplicate_parameter"
  };
}

async function recordEmailError(ref, kind, error) {
  const prefix = kind === "reminder" ? "reminderEmail" : "confirmationEmail";
  await ref.set(
    {
      [`${prefix}State`]: "error",
      [`${prefix}LastError`]: String(error?.message || error).slice(0, 500),
      [`${prefix}LastAttemptAt`]: FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  logger.error(`Appointment ${kind} email failed`, {
    appointmentPath: ref.path,
    error: error?.message || String(error)
  });
}

async function sendAndMarkAppointmentEmail({
  ref,
  appointmentId,
  appointment,
  kind
}) {
  const isReminder = kind === "reminder";
  const prefix = isReminder ? "reminderEmail" : "confirmationEmail";

  await ref.set(
    {
      [`${prefix}State`]: "sending",
      [`${prefix}LastAttemptAt`]: FieldValue.serverTimestamp(),
      [`${prefix}LastError`]: FieldValue.delete()
    },
    { merge: true }
  );

  try {
    const result = await sendBrevoEmail({
      appointmentId,
      appointment,
      kind
    });

    await ref.set(
      {
        [`${prefix}Sent`]: true,
        [`${prefix}State`]: "sent",
        [`${prefix}SentAt`]: FieldValue.serverTimestamp(),
        [`${prefix}MessageId`]: result.messageId,
        [`${prefix}ForStartAt`]: appointment.startAt,
        [`${prefix}LastError`]: FieldValue.delete()
      },
      { merge: true }
    );

    logger.info(`Appointment ${kind} email sent`, {
      appointmentId,
      clientEmail: appointment.clientEmail,
      duplicateProtected: result.duplicateProtected
    });
  } catch (error) {
    await recordEmailError(ref, kind, error);
    throw error;
  }
}

exports.sendAppointmentConfirmation = onDocumentCreated(
  {
    document: "appointments/{appointmentId}",
    region: REGION,
    secrets: [BREVO_API_KEY]
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const appointment = snapshot.data();

    if (!isActiveAppointment(appointment)) return;
    if (!validEmail(appointment.clientEmail)) return;
    if (appointment.confirmationEmailSent === true) return;

    await sendAndMarkAppointmentEmail({
      ref: snapshot.ref,
      appointmentId: event.params.appointmentId,
      appointment,
      kind: "confirmation"
    });
  }
);

exports.sendAppointmentUpdate = onDocumentUpdated(
  {
    document: "appointments/{appointmentId}",
    region: REGION,
    secrets: [BREVO_API_KEY]
  },
  async (event) => {
    const beforeSnapshot = event.data?.before;
    const afterSnapshot = event.data?.after;
    if (!beforeSnapshot || !afterSnapshot) return;

    const before = beforeSnapshot.data();
    const after = afterSnapshot.data();

    const detailsChanged = appointmentDetailsChanged(before, after);
    const reactivated =
      !isActiveAppointment(before) && isActiveAppointment(after);

    if (!detailsChanged && !reactivated) return;
    if (!isActiveAppointment(after)) return;
    if (!validEmail(after.clientEmail)) return;

    // A changed appointment gets a new reminder for its new details.
    await afterSnapshot.ref.set(
      {
        reminderEmailSent: false,
        reminderEmailState: "waiting",
        reminderEmailForStartAt: FieldValue.delete()
      },
      { merge: true }
    );

    await sendAndMarkAppointmentEmail({
      ref: afterSnapshot.ref,
      appointmentId: event.params.appointmentId,
      appointment: after,
      kind: detailsChanged ? "update" : "confirmation"
    });
  }
);

exports.sendAppointmentReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    timeZone: TIME_ZONE,
    region: REGION,
    secrets: [BREVO_API_KEY],
    memory: "256MiB",
    timeoutSeconds: 120
  },
  async () => {
    const now = Date.now();
    const targetMs = REMINDER_HOURS_BEFORE.value() * 60 * 60 * 1000;

    // The scheduler runs every 15 minutes. This one-hour due window gives a few
    // retry opportunities while keeping the message very close to the intended
    // reminder time.
    const earliestDue = targetMs - 20 * 60 * 1000;
    const latestDue = targetMs + 40 * 60 * 1000;

    // Query ONLY appointments inside the reminder window.
    // This stays efficient even as years of appointment history accumulate.
    const windowStart = Timestamp.fromMillis(now + earliestDue);
    const windowEnd = Timestamp.fromMillis(now + latestDue);

    const snapshot = await db
      .collection("appointments")
      .where("startAt", ">=", windowStart)
      .where("startAt", "<=", windowEnd)
      .get();

    let sentCount = 0;
    let skippedCount = 0;

    for (const docSnapshot of snapshot.docs) {
      const appointment = docSnapshot.data();

      if (!isActiveAppointment(appointment)) {
        skippedCount += 1;
        continue;
      }

      if (appointment.reminderEmailSent === true) {
        skippedCount += 1;
        continue;
      }

      if (!validEmail(appointment.clientEmail)) {
        skippedCount += 1;
        continue;
      }

      try {
        await sendAndMarkAppointmentEmail({
          ref: docSnapshot.ref,
          appointmentId: docSnapshot.id,
          appointment,
          kind: "reminder"
        });
        sentCount += 1;
      } catch {
        // Error details were already written to Firestore and Cloud logs.
        // Continue so one bad email does not block reminders for other clients.
      }
    }

    logger.info("Appointment reminder check finished", {
      queriedCount: snapshot.size,
      sentCount,
      skippedCount,
      windowStart: windowStart.toDate().toISOString(),
      windowEnd: windowEnd.toDate().toISOString()
    });
  }
);
