# Phase 3 smoke-test checklist (use your own test records)

1. **Public registration, email:** select Email only; confirm the separate SMS checkbox stays hidden. Submit and verify `communicationPreference = "email"`, `smsConsent = false` in Firestore.
2. **Text opt-in:** select Text only; the SMS checkbox should appear **unchecked** and prevent submission until checked. Choose Both and confirm it remains required. No text is actually sent yet.
3. **Opt out:** choose No automated appointment updates. The SMS checkbox should be hidden and false. Optional promotional email consent must stay separate and unchecked by default.
4. **Directory:** sign in to `admin.html`; search by name/email/phone and confirm the new client's chosen preference appears on the client row.
5. **Archive/restore:** archive a disposable test client, confirm active count drops by one and they disappear from the appointment picker. Check Show archived clients and restore them; active count should recover.
6. **Appointment picker:** click Add Appointment, type part of a name/email/phone, click the matching client; the selected name should remain in the search field. Typing different text invalidates the old selection and requires selecting a result.
7. **Permanent deletion:** archive a disposable test client with a test appointment; check Show archived clients → Delete Permanently → type DELETE. Confirm the client **and their linked appointment** no longer appear. Do not use a real client for this test.
8. **Compatibility:** an old client who registered under the previous form is still visible, marked Preference not collected (legacy registration), and can be archived/restored. Existing appointments still display.
9. **Privacy and links:** verify `privacy.html` and `sms-terms.html` are accessible publicly and all registration links work from a phone.

If the current registration stops working immediately after publishing rules, check whether the new website files have finished deploying; the old form uses a different Firestore document schema.
