# Live Head to Head — deployment

The static game files are ready for GitHub Pages. **Live H2H stays disabled until the Firebase backend is deployed and activated.** Existing single-player sign-in keeps its current adapter until activation. No paid services have been provisioned by this update.

## What runs where

- GitHub Pages serves the game and WebRTC client. Host simulation runs at 120 Hz, controls are transmitted at 30 Hz and compact visual snapshots at 20 Hz. The guest interpolates snapshots with a small local movement prediction.
- Firebase handles verified usernames, room ownership, approvals, invites, presence, signaling and final reports. Firestore never receives per-frame player positions.
- Firebase callable functions check credentials and mint custom Auth tokens. Players still enter only their existing **username + six-digit passcode**, with no email form/provider required. Stable profile IDs and old histories are preserved.
- As requested, PINs remain plain text in `gameLogins`. The new rules make those documents inaccessible to website clients; only server code can check or reset them. Keep Firebase project access limited to trusted administrators.
- A TURN service provides temporary relay credentials for networks where a direct peer connection is unavailable. Permanent relay credentials must never appear in frontend files.

## 1. Prepare Firebase

Use project **lsl-rivals**. Back up the current Firestore database/rules before the account migration. There is a brief sign-in maintenance window between publishing the new rules and activating the new account adapter.

1. Open Firebase Console → Authentication → Get started. Custom-token authentication does not need the Email/Password sign-in provider. The existing configuration returned `CONFIGURATION_NOT_FOUND` during the local check, so Authentication needs to be initialized/checked before activation.
2. In project settings, confirm `src/firebase-config.js` matches the web app configuration. Do not substitute an unrelated project's API key. Add the actual GitHub Pages host and `localhost` to Auth authorized domains where required.
3. Cloud Functions deployment requires the Blaze billing plan. Review pricing and budget alerts before enabling billing: https://firebase.google.com/docs/functions/get-started
4. Install Node.js 22 and Firebase CLI on your development computer, then sign in:

```sh
npm install -g firebase-tools
firebase login
npm ci --prefix functions
node scripts/build-h2h-server.mjs
```

The build command copies the same match engine and actual season catalog into the verification service. Run it again whenever match physics, rules, rosters or ratings change. Firebase deployment runs it automatically too. Release the matching frontend and backend together; do not change physics while live rooms are active.

## 2. Configure administrators and TURN

Create `functions/.env.lsl-rivals` locally (ignored by Git):

```dotenv
ADMIN_UIDS=your-existing-gameProfiles-document-id
```

Multiple admin IDs can be comma-separated. Use your existing `gameProfiles` document ID, not a username or password. Admin actions now require that signed-in account AND the existing admin-page unlock; a public browser password alone no longer grants database administration. Nobody is granted admin automatically.

Create a TURN key with your relay provider. This implementation accepts a provider endpoint that receives `POST {"ttl":3600}` and returns `{ "iceServers": [...] }`, such as Cloudflare Realtime TURN:
https://developers.cloudflare.com/realtime/turn/generate-credentials/

Set the secret interactively:

```sh
firebase functions:secrets:set H2H_TURN_CONFIG --project lsl-rivals
```

At its prompt, enter a JSON object with your own endpoint and authorization value:

```json
{
  "endpoint": "https://rtc.live.cloudflare.com/v1/turn/keys/YOUR_TURN_KEY_ID/credentials/generate-ice-servers",
  "authorization": "Bearer YOUR_TURN_API_TOKEN"
}
```

Do not put that token in a GitHub commit or static asset. Firebase reads the secret server-side and returns only expiring credentials to accepted room participants. See https://webrtc.org/getting-started/turn-server for why a relay is necessary on some networks.

## 3. Deploy, then activate

From the repository root:

```sh
firebase deploy --project lsl-rivals --only functions:lantern-rush-live,firestore:rules
```

If custom-token creation reports a `signBlob` permission error, grant the function runtime service account the required Service Account Token Creator role on the signing service account, following https://firebase.google.com/docs/auth/admin/create-custom-tokens . Do not grant project-wide roles to players.

Publish the updated static game files to GitHub Pages. Then create/update this Firestore document using Firebase Console:

- Collection: `runtime`
- Document: `live`
- Field: `enabled` = **true** (Boolean)

This is the final activation step. Players should refresh and sign in again. Existing plain PINs work; older PBKDF2 PINs migrate only after a correct sign-in. Unknown legacy credentials need an authorized admin reset.

Do not publish these stricter rules alone and stop: old browser-only sign-in cannot read credentials under them. If deployment fails before activation, keep the update in maintenance while fixing the backend. Never reopen public credential/room writes to make H2H appear to work.

## 4. Check a real two-device match

Local tests cover room policy, both human controllers, JSON snapshots, deterministic full-match verification, and report mirroring. A local browser fixture also exercises real WebRTC channels with local signaling. **Production Firebase rules/functions and a cross-network TURN match still require this deployment check.**

1. Sign into two different accounts, preferably on Wi-Fi and cellular. Create a 1-minute room on one device.
2. Request to join. Verify no lobby entry before host acceptance; test Deny, Lock and Unlock. An invitation still requires host approval.
3. Choose different teams/formations. Both must press Ready before Start becomes available.
4. Confirm countdown, both players' movement, passing/shooting, goalkeeper control, restarts and score updates. Check live room status from the invite/recent views.
5. At halftime, make a substitution and continue on both devices. Attack directions and kickoff possession should reverse correctly.
6. Interrupt a connection briefly, then reconnect within 25 seconds. Controls pause during reconnection; a timeout abandons the match without fabricating a win.
7. At full time, keep both pages open until **Verified · Saved to both players’ History** appears. Check both reports have mirrored scores, actual opponent account names, lineups and full stats. Repeated save attempts must not create duplicate records.
8. Test signed-out, unrelated-account, non-host approval, locked-room entry and direct room/result writes against the deployed rules. These must fail.

## Integrity and practical limits

The host is the live simulation authority; the guest sends controls, not positions or scores. Reliable input/command timelines are shared with both players. Both accounts confirm the same timeline digest, and the server re-runs the bundled engine from the stored seed and official rosters before atomically saving both reports. Final submitted scores/stats are not trusted. Room-card live scores are provisional until verification completes.

This is private peer-hosted play, not a dedicated authoritative anti-cheat server. Two colluding modified clients can agree on a fabricated input timeline; server replay proves that the submitted inputs produce the result, not that real human fingers produced those inputs. Competitive prizes would need a dedicated live simulation service.

A temporary network interruption can reconnect while the hosting tab remains alive. Closing/reloading the hosting tab loses its in-memory simulation and ends that match. Abandoned matches do not enter completed-match History. Completed room cards remain visible for five minutes, then are filtered out of the active list; result reports remain in History. Expired room/signaling documents are retained in Firestore until administrative cleanup (no automatic deletion of account history).

Room previews update approximately every 2.5 seconds, presence every 25 seconds. Signaling, input traces and verification incur Firebase usage. Keep both accounts' pages open through verification. All match lengths are shared across modes: 1/2/3/4/5/6 minutes, split equally at halftime.
