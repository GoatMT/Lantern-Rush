# Accounts and Firebase rules

Players use a case-insensitive 2–12 character username (letters, numbers, underscores) and exactly six digits. Profile IDs, photos and histories remain stable when accounts are renamed. PINs are not stored in public profiles or browser session records.

## Live H2H account upgrade

Read [LIVE-H2H-SETUP.md](./LIVE-H2H-SETUP.md) before deploying this version's rules. It contains the coordinated free Worker/rules deployment and final activation step.

Until `runtime/live.enabled` is true, the site retains its existing browser-only account adapter. That legacy system does not provide verified identity and cannot authorize Live H2H. Live H2H is disabled in that state.

After activation, the free Worker verifies the same username/passcode and mints Firebase custom-auth tokens. No email sign-in is added. The new rules deny all client access to `gameLogins`; PINs remain plain text server-side as the owner requested. Older hashed PINs convert after a successful sign-in. A passcode reset changes the credential revision and invalidates earlier tokens for protected reads/writes.

Public profiles and completed match reports are readable. Only the owning verified user may upload their CPU match reports. H2H histories are written by the server after both participants confirm the input timeline and it passes deterministic engine verification. CPU match uploads retain client-generated statistics; they are not advertised as verified H2H results.

## Administration

Open `admin.html` and enter the operator password. No player sign-in is required. The Worker checks its private `ADMIN_PASSWORD` secret for every rename, passcode reset, deletion and merge. The browser retains the entered password only in memory until Lock Admin or a reload; it is not saved in browser storage or included in website source. Admin requests are rate limited. Merge keeps the destination username/passcode and preserves both accounts' history; the source sign-in is removed. Deletion removes the selected profile and sign-in; existing archived match reports are retained.

Merging retains the destination's credentials and preserves attributed histories, including source account names in older reports. Resetting a PIN does not erase match history. Profile photos are resized to 512 × 512 and checked against the storage limit.

Do not deploy the new rules without the corresponding free Worker and activation steps. Do not restore public credential writes to fix a permission error. All setup instructions and troubleshooting are in the linked guide.
