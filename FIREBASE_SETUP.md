# Genetik Bleu — Phase 3 setup (current)

**Project:** `genetik-bleu`  
**Live website:** `genetikbleu.com` on GitHub Pages  
**Database:** Firestore; approved dashboard administrators have an `admins/{uid}` document.

Your earlier client registration, appointment creation, rescheduling and cancellation tests succeeded. You do **not** need to create a new Firebase project or a new administrator account.

## What this ZIP adds

- Public registration: clients explicitly choose **email only, text only, both, or no automated appointment updates**. SMS requires a separate unchecked checkbox. Optional promotional *email* consent is separate; promotional SMS is not offered. The record stores the selected preference and consent timestamps.
- Admin directory: archive, restore, and permanently delete a client and their associated appointment documents. Active-client counts and the new-appointment picker exclude archived clients.
- Appointment editor: search by name, email, or phone instead of scrolling through a dropdown. Search returns only active clients.
- `privacy.html` and `sms-terms.html`: draft public disclosures for owner review before any messaging enrollment. Links appear in the registration form; privacy is also in the footer.
- `CNAME`: preserves the existing `genetikbleu.com` GitHub Pages custom domain.
- `firestore.rules`: permits the new registration schema while maintaining admin-only client access; admins can archive and restore records without changing consent fields through the website.

**Automated email/text delivery is NOT active.** This release saves preferences; it never contacts Resend, Twilio, or any other delivery service. Do not present reminders as operational to clients until the provider and server phases are deployed and tested.

## Deploy in this order

1. Make a backup of your current GitHub repository or retain its last working commit/ZIP.
2. In Firebase Console → **Firestore Database → Rules**, replace the rules with this ZIP's `firestore.rules` and publish. **The old public registration form may briefly stop accepting new registrations until step 3 is live.** Your existing client and appointment records remain accessible.
3. Upload this ZIP's *folder contents* to the same GitHub repository branch/root used by Pages. `index.html`, `registration.html`, `admin.html`, `styles.css`, the `images/` folder, and `CNAME` must all be at repository root. Do not put the whole downloaded folder one directory down.
4. Wait for GitHub Pages to finish deployment; open `https://genetikbleu.com/registration.html` and confirm the new four-choice preference form appears. If you still see the old checkbox, refresh without cache or wait for the deployment.
5. Open the private `admin.html` page and confirm your existing Google administrator sign-in still works.
6. Use your own **test** client to verify the four preferences, archive/restore, searchable picker, and permanent deletion. The permanent deletion is irreversible and removes all linked appointment documents. Do not test it on a real client.

## What happens to the old client records?

Records registered before this release do not contain explicit channel preferences. The dashboard labels them **Preference not collected (legacy registration)**. These clients must **not** automatically receive SMS or email updates based on the earlier broad `marketingConsent` checkbox. If they want automated reminders, obtain their selection and new consent through the updated registration flow first. Because the public form currently creates a new record, archive their earlier record after reconciling any old appointments; avoid accidentally creating two active records for the same person. We can build a secure existing-client preference update workflow later.

## Archive versus permanent deletion

- **Archive** hides the client from the active list and searchable booking picker; linked appointment history remains in the dashboard. You can restore the client later. Cancel upcoming appointments separately if they should not occur.
- **Delete Permanently** appears only when you check **Show archived clients**. It requires typing `DELETE` and removes the client plus linked appointment documents in one Firestore batch. Records with more than 450 associated appointments require a separate administrative deletion procedure.
- This version has no messaging job history to purge. When the messaging backend is added, its deletion/opt-out flow must handle provider-side and job data as well.

## The next phase: activate actual email and SMS

The browser cannot safely hold provider API credentials or send messages by itself. Keep GitHub Pages for the site. We will add **Firebase Cloud Functions** and server-held secrets after Marni has approved the sending identity, wording and messaging terms.

- **Email:** create a transactional sending account with a provider (proposed: Resend), verify an authorized sending domain/subdomain with the DNS records that provider supplies, and choose the salon's sender name/address.
- **Text:** create an SMS provider account (proposed: Twilio) with the salon's correct legal business information, a sending number/service and, for US 10-digit application texting, approved A2P 10DLC brand/campaign registration. Do not use your personal details to misrepresent the salon. Review the live SMS opt-in form and terms with the provider. Configure STOP/HELP handling and make the backend honor opt-outs.
- **Firebase backend:** Cloud Functions deployment requires the Firebase Blaze billing plan. We will implement server-side appointment triggers, confirmation/update/cancellation templates, a scheduled reminder worker, deduplication and cancellation checks, and live preference/opt-out checks before sending. Never place API keys or auth tokens in your public GitHub repository.
- **Owner review:** Have Marni review the draft `privacy.html` and `sms-terms.html` and verify they describe the salon's actual practices. Messaging laws and carrier/provider requirements can vary; check current provider guidance before activating.

**Do not enable messaging just by editing the HTML.** No provider credentials are included in this ZIP, and no message will be sent until the server phase is explicitly deployed.
