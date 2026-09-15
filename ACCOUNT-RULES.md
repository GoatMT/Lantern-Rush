# Lantern Rush account rules

Lantern Rush uses the lsl-rivals Firebase project supplied for this game.

## Player-facing rules

- A username is **2–12 characters**.
- Usernames may contain letters, numbers and underscores.
- Usernames are case-insensitive for sign-in, so PlayerOne and playerone refer to the same login.
- A passcode is **exactly six digits**.
- Firebase Authentication stores the passcode; the game never writes the passcode into Firestore.
- A profile picture may be any image size. The browser center-crops it to a 512 × 512 WebP before saving the profile copy.
- Match history stores the selected season, mode, teams, score, goals and full match statistics.
- Public charts expose the username, optimized profile picture, aggregate game totals and record holders. They never expose the passcode.
- Signing out removes the local Firebase session. It does not delete the account or its history.

## Firebase deployment

The rules are in firestore.rules. Deploy them from the LSL Game folder after selecting the lsl-rivals project:

    firebase use lsl-rivals
    firebase deploy --only firestore:rules

The Firebase Console must also have **Authentication → Sign-in method → Email/Password** enabled. Firebase Auth uses an internal address derived from the normalized username; players only see and enter their username and six-digit passcode.

Add the published GitHub Pages origin under **Authentication → Settings → Authorized domains**. Keep localhost enabled for local development.

The Firestore rules allow public reads of gameProfiles for charts and public profiles. Only the matching authenticated UID can create or update its own profile. Username, username key and UID cannot be changed after creation. Profile deletion and cross-account edits are reserved for a Firebase Authentication custom claim named `admin`; the public admin page never uses its visible password as Firestore authorization.

## Admin console

Open `admin.html` to use the locked account console. The browser lock uses **BlueM123** as the requested operator password, while Firestore still requires the safer server-issued `admin` custom claim. A Firebase Admin SDK or Cloud Function must set that claim on `admin@accounts.lsl-rivals.app` before rename, merge, delete or reset-request actions can write. This keeps a static GitHub Pages build from shipping a credential that can directly rewrite every profile.

The console can list profiles, reset account names, merge saved profile history and totals, delete profile data, and flag a passcode reset request. Directly replacing another user's Firebase Authentication password requires the trusted Admin SDK; the static client records the request rather than pretending it can perform that privileged operation.
