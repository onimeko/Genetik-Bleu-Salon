# Genetik Bleu Salon — Firebase Phase 2

Firestore and Google Authentication are now enabled. This package adds the private, iPad-friendly **Client + Appointment Manager**.

## What is new

- `admin.html` — private dashboard; intentionally not linked from the public site.
- `admin.js` — Google sign-in, admin authorization, client directory, search, and appointment CRUD.
- `admin.css` — responsive desktop/iPad/iPhone dashboard styling.
- `firestore.rules` — public client creation + administrator-only client/appointment access.

Automated email/SMS sending is **not active yet**. Appointment records already include tracking fields that Phase 3 can use for confirmation/reminder delivery.

## NEXT STEP A — Publish the new Firestore Rules

1. Firebase Console → **Firestore Database**.
2. Open the **Rules** tab.
3. Replace everything there with the contents of this package's `firestore.rules` file.
4. Click **Publish**.

Do not create the `clients` or `appointments` collections manually.

## NEXT STEP B — Authorize the website domain for Google sign-in

Firebase Console → **Authentication → Settings → Authorized domains**.

Add the domain where you are testing the site. Examples:

- GitHub Pages: `onimeko.github.io`
- Local VS Code Live Server: add `localhost` if it is not already listed.

Do not enter `https://` or a page path in the Authorized domains list — enter the domain only.

## NEXT STEP C — Get your Firebase UID

1. Serve the website through GitHub Pages, Firebase Hosting, or VS Code Live Server. Do not open `admin.html` through a `file://` URL.
2. Open `admin.html`.
3. Click **Sign in with Google** and choose your Google account.
4. The page will display your Firebase UID.
5. Copy that UID and send it to ChatGPT.

At this point the dashboard will correctly say that your account is authenticated but not yet approved.

## NEXT STEP D — Create your administrator document

After you have your UID, ChatGPT will walk you through creating exactly one document:

`admins/YOUR_FIREBASE_UID`

The admin page itself cannot create this document. That is intentional security protection.

Once the document exists, refresh `admin.html`. The Client + Appointment Manager will unlock.

## What the dashboard can already do after authorization

- Display all registered clients.
- Sort clients alphabetically by last name, then first name.
- Search by name, email, or phone.
- Create appointments for a client.
- Edit/reschedule appointments.
- Change appointment status: Scheduled, Confirmed, Completed, Cancelled.
- Delete appointments.
- Show client and upcoming-appointment counts.
- Work responsively on desktop, iPad, and phone.

## Security model

Public visitors can create a valid registration record, but cannot read the client list.

Google sign-in by itself does NOT grant client access. The signed-in Firebase UID must also have an `admins/{uid}` document created manually in Firebase Console.

The website cannot create, edit, or delete administrator authorization documents.

## Still intentionally postponed

Do not set these up yet:

- Twilio
- automated SMS
- transactional email provider
- scheduled reminder functions
- Firebase App Check enforcement
- service-account private keys

After the Client + Appointment Manager is fully tested, we will move to automated confirmations and reminders.
