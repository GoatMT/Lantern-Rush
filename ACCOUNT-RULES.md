# Lantern Rush accounts — temporary username/passcode system

This version uses Firestore directly, like LSL Pulse and Melation Sound. No email,
email verification, Firebase Authentication provider or admin custom claim is needed.

## Player rules

- Username: 2–12 letters, numbers or underscores; sign-in is case-insensitive.
- Passcode: exactly six digits. The raw passcode is never saved in Firestore or local storage.
- Passcodes use a per-account random salt and PBKDF2-SHA-256 (120,000 iterations).
- Usernames are reserved atomically to prevent two normal registrations taking the same name.
- Sign-in persists on the device. Signing out clears the session, not match history.
- Renaming keeps the stable account ID, stats, photo and passcode.
- An admin passcode reset invalidates existing browser sessions on their next account check.
- Existing profiles from the former Auth system keep their data. Use Admin → Reset Passcode
  once to give an old account a six-digit code for this system. Old Auth credentials are not read or deleted.
- Profile photos are resized to 512 × 512; photos exceeding the stored size limit are rejected clearly.

## Publish the Firestore rules

The new rules must be published once for the new collections. This is a Firestore
setup step, not an Email/Password Authentication setup.

In Firebase Console → **lsl-rivals → Firestore Database → Rules**, replace the rules
with the contents of `firestore.rules`, then click **Publish**. If the database does
not exist yet, create the default Firestore database first.

Alternatively, with Firebase CLI installed and signed in:

```sh
firebase deploy --project lsl-rivals --only firestore:rules
```

Push changed game files to GitHub Pages and refresh the browser.

## Admin

Open `admin.html` and use the existing admin password. Admin can rename accounts,
set new six-digit passcodes, delete accounts, and atomically merge one profile into
another. A merge keeps the destination sign-in and removes the source login.
The admin page locks again when reloaded. Player and admin sign-ins are independent.

## Scope and future replacement

On 2026-09-19 the owner explicitly selected the simple client-side account model of
the reference sites, accepting that PIN checks and the admin gate can be bypassed.
The rules validate shapes, not who is editing. Public profiles, stats and individual
hashed-PIN documents can be accessed through Firestore; direct API clients can
modify the three account collections. This is not verified authentication, private
storage, or a cheat-proof leaderboard.

`src/account-store.js` owns identity, hashing, username reservations, sessions and
admin operations. `src/cloud-account.js` is the stable facade used by menus, the
match engine and charts. A future verified provider can replace the adapter while
retaining stable IDs and `gameProfiles` data. Public profile objects do not contain
PIN hashes or raw passcodes.

Collections: `gameProfiles` (public profile/statistics), `gameUsernames` (unique-name
index), `gameLogins` (salted hash and session revision). Other paths remain denied.
No data or accounts are shared with the separate LSL Website/Melation Firebase projects.

## Full match archive
Publish the updated firestore.rules to enable gameProfiles/{uid}/matches/{matchId}. Completed matches are immutable individual documents with no 50-match history cap. Reports are queued in IndexedDB before uploading and retried at sign-in, when reconnecting, or with History > Retry Sync. Do not clear site data while reports are pending. Charts, Account and History calculate statistics from these reports and retained legacy entries. Older matches already discarded by the old 50-match limit cannot be reconstructed. Legacy details are shown as unrecorded. Account merges retain archive source IDs; new identities do not inherit deleted accounts' archives.

