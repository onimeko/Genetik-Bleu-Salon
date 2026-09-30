# Genetik Bleu — Appointment Email Stage 1

This package adds server-side appointment email automation without exposing an email API key in the website.

## What it will do after deployment

- New appointment -> immediate service-related confirmation email
- Rescheduled / changed appointment -> updated confirmation email
- Upcoming active appointment -> reminder approximately 24 hours before the appointment
- Cancelled/completed appointments do not receive reminders
- Rescheduling re-arms the reminder for the new date/time
- All appointment times are formatted in America/Chicago

## Email provider

The function is wired to Brevo's transactional email API. The sender email is configured at deployment time and must be verified in Brevo.

IMPORTANT: Never put the Brevo API key in firebase-config.js, admin.js, GitHub, or any browser file. The backend expects it in Firebase Secret Manager.

## Before deployment

1. Firebase project `genetik-bleu-website` must be on the Blaze pay-as-you-go plan because production Cloud Functions require billing.
2. Create/choose a Brevo account.
3. Verify the email address that Genetik Bleu will send appointment messages from.
4. Create a Brevo API key.

## Files

- `admin.js` — public/admin website change. Replace the current GitHub copy.
- `functions/index.js` — private server-side appointment email logic.
- `functions/package.json` — backend dependencies/runtime.
- `firebase.json` + `.firebaserc` — Firebase CLI project configuration.

## Deployment commands

Run these from the ROOT of the Genetik Bleu repository in VS Code Terminal:

```text
npm install -g firebase-tools
firebase login
firebase use genetik-bleu-website
cd functions
npm install
cd ..
firebase functions:secrets:set BREVO_API_KEY
firebase deploy --only functions
```

When deployment asks for `EMAIL_SENDER_ADDRESS`, enter the verified sender email from Brevo.

`REMINDER_HOURS_BEFORE` defaults to 24, so there is nothing else to configure unless you want a different reminder time later.

## Safe first test

After deployment:
1. Register a temporary client using an email address you can check.
2. Create a future appointment for that test client from admin.html.
3. Confirm the appointment confirmation arrives.
4. Delete the test appointment/client when finished.

For testing the reminder itself without waiting 24 hours, temporarily change the default reminder hours in `functions/index.js`, redeploy, test, and then restore it to 24 before going live.


## Scalability note for Marni's established salon

The reminder scheduler does not scan the full appointment collection.

Every 15 minutes it queries only appointments whose `startAt` value falls inside
the current reminder window (roughly 24 hours away). Old appointment history is
not repeatedly read as the database grows.
