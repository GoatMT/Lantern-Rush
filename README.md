# Lantern Rush

An original, silent 3D 7v7 arcade soccer game for desktop and mobile browsers. Built with Three.js and plain JavaScript modules. This folder is the complete standalone website; it does not depend on the adjacent LSL Website folder at runtime.

## Play locally

Install Node.js 20.11 or newer, then open a terminal in **LSL Game**:

    node scripts/serve.mjs

Open **http://localhost:4173/**. No package installation or build is required. For a phone on the same Wi-Fi, use the computer's LAN address and port 4173. Use landscape orientation for the largest play area.

Use a local HTTP server instead of double-clicking index.html: browsers restrict module and JSON loading from file:// URLs. The local server is only a development convenience. GitHub Pages serves the released game without a backend.

## Publish on GitHub Pages

1. Create a GitHub repository for the game.
2. Upload the **contents of LSL Game**, including index.html, all CSS files, src, data, assets, vendor and the hidden .nojekyll file. Put index.html at the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**, then **main** and **/(root)**. Save.
5. When deployment finishes, use the URL GitHub displays, usually **https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/**.

The entire game uses relative asset paths and includes its pinned Three.js dependency locally. A project Pages URL with a repository-name prefix works without changing code. There are no API keys, accounts, external fonts, audio, runtime CDNs or permanent servers.

To update: replace the changed files, commit/push to the selected branch, and let Pages redeploy. Reload an already-open game to receive the update.

If adding the game to an existing website repository instead, keep all game files together in a subfolder, such as game/, and link to game/index.html. Do not overwrite the league website's own index.html.

Official publishing reference: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move / aim | W A S D | Right-side joystick |
| Sprint | Hold P | Hold SPRINT |
| Pass / closest player | M | PASS / SWITCH (hold to press when defending) |
| Shoot / tackle | Hold and release K | Hold and release SHOOT / tap TACKLE |
| Dribble skill | O | DRIBBLE |

| Pause | Escape | Top-right pause button |

Hold Shoot to charge power. Moving the joystick farther increases running speed. Passes choose a teammate in the aimed direction, lead forward runs, and become crosses near the attacking wings. **M passes when you have the ball and selects your closest active outfield player otherwise.** Q no longer has a switching action. The separate touch SWITCH button also selects the closest eligible teammate. Hold Pass before receiving a teammate's pass for a first-time return; high balls can become header passes. While defending, Shoot tackles and holding Pass presses the ball carrier. Tapping Shoot beside a loose ball attempts a first-time shot, volley or header depending on its height.

Move and tap Skill for a contextual feint, step-over, ball roll, quick cut, drag-back or other skill. Direction, speed and nearby defenders affect the choice. Skill while charging a shot performs a fake shot. Difficult skills can lose the ball, especially with lower control ratings. Skills have a cooldown.

For penalties and free kicks, movement changes the gold aiming guide. Shoot or Pass takes the restart. Throw-ins and goal kicks use the same buttons. Restarts are taken automatically after a short timeout if there is no input.

Settings supports rebindable keys, Easy/Normal/Hard difficulty, 3/4/5/6-minute games and Low/Medium/High graphics. The Camera section has Low (closer), Medium (balanced), High (tactical) and Broadcast (default sideline view). Camera changes apply immediately. Preferences and the last selected season/teams are saved locally when storage is available.

## Match rules and flow

The expanded pitch is **128 × 84 world units**, compared with the original 64 × 42: **four times the playable area** (each side is doubled). Players and the referee now have larger visual silhouettes for readability: about 31% larger on desktop and 52% larger on compact/mobile layouts than the former 1.13 model scale. The closer compact broadcast camera further increases their on-screen size. The ball, field dimensions, collision distances and match rules remain consistent. Goals, boxes, formation spacing and the surrounding stadium follow the enlarged field.

Base running speed is 7.3 units/second (about 16% faster) and sprint speed is 11.8 (about 34% faster). Stamina capacity is 70% at 75 OVR and below, scales linearly for ratings 76–98, and reaches the original 100% at 99 OVR. Recovery is 1.2 percentage points per second when not sprinting. Reaching zero locks recovery until a match stoppage (including goals, restarts and halftime); pausing does not unlock it. Stoppages resume slow recovery without instantly refilling the bar. Fresh substitutes start at their own rating-based capacity. Passes account for distance and friction, lead longer runs and reach up to 46 units/second; charged shots reach approximately 49. Teammates keep wider lanes, one defender presses while another covers, and goalkeepers anticipate incoming shots across the wider goal. The broadcast camera follows the expanded boundaries and pulls back for passing options and fast balls.

Field dimensions and gameplay tuning are centralized in **src/config.js**. Player-sized collision, tackle and dribble distances remain separate from pitch dimensions.

- Seven starters per team: one goalkeeper and a 2–2–2 outfield formation.
- A 14-second skippable intro: stadium opening, team badges, sequential user lineup cards, a shorter CPU lineup, players to watch, and a walk into formation. Overhead names appear for about four seconds before kickoff.
- First half → halftime → second half → full time.
- The selected duration is active real-time play split equally between halves. Restarts, goal celebrations, pauses and the halftime screen stop the clock.
- At halftime, make substitutions and choose Continue. Teams change ends and the CPU receives the second-half kickoff.
- Corners, throw-ins, goal kicks, free kicks, penalties, yellow cards and red cards.
- A second yellow dismisses the player. Red-carded players stay off the pitch. Fewer than three remaining players forfeits the game.
- **No offside rule.**
- Substitutions wait for a stoppage, or apply immediately at halftime. Players who leave cannot re-enter; all available bench players may be used. The CPU uses up to three changes when players tire.
- Full-time statistics include goals, shots, shots on target, possession, passing, fouls, cards, corners, saves, scorers, assists and substitutions.
- Player of the Match considers goals, assists, completed passes, tackles, saves, involvement and discipline.

The game uses simplified arcade rules and physics, with contextual actions, assisted aiming, procedural animations and a short live celebration camera. It does not record video replays. Player models are stylized game characters, not likenesses.

## Player and gameplay detail

Characters have jointed knees and elbows, visible faces, deterministic generic hair/skin/build variations, kit textures, cleats, goalkeeper gloves and captain armbands where the source lists a captain. Their identity remains stable across matches and seasons. No generic appearance is presented as a real player's likeness.

Locomotion uses actual velocity and distance traveled, with acceleration, braking, turning limits, lean and pose blending. Separate contextual poses cover receiving, passing, shooting, skill moves, tackles, falls/recovery and celebrations. Goalkeepers use a ready stance, shuffles, dives toward the ball, catches, parries, punches, recovery and distribution. Fine facial geometry, hair detail, collars and boot studs appear at closer camera distances on Medium/High. Low keeps the animated silhouette, source numbers and original kit pattern. Static parts are merged per animated joint to reduce drawing work.

Possession uses intermittent touches; the ball is free to move between them. Grass drag and rolling resistance stop loose balls, airborne drag and spin shape flight, and bounces lose energy. First touches cushion incoming passes according to speed, movement, rating and pressure. A successful goalkeeper catch holds the ball in the hands before a roll, throw or punt. Hard saves allow rebounds, and the net absorbs most goal momentum.

Both teams continuously update preferred zones, support lanes, pressing/cover roles, marking, overlaps, near/far-post runs and loose-ball targets. Only the nearest appropriate players pursue the ball; others retain useful spacing. Goalkeepers position for the shooting angle and judge when to leave their line. Camera overrides cover kickoffs, set pieces, cards, substitutions, goals and half/full time before returning to the saved view.

## Real LSL data

Bundled seasons: **2024, 2025 and 2026**, containing **24 teams** and their original season-specific roster memberships.

Source: the existing LSL Website data/{season}/teams.json files and matching player metadata. Team and player IDs, roster names and known jersey numbers are preserved. Numbers absent from the source remain absent; the name is printed on the back without a made-up number. Known numbers are printed on both the front and back. Player personal/contact details and photos are not needed by the game and are omitted.

Published positions are used when choosing the lineup. Where records only say Field, or a team lacks enough specialists, a game formation role is assigned to an existing roster member. No extra players or teams are fabricated. Every team badge is copied from the supplied Logos folder.

Every starter and substitute has the **career overall and player style displayed by the LSL Website**. The sync script runs the website's actual data loader, alias mapping, playerOVR and inferPlayerStyle calculations. These are current career profiles across the website's configured seasons, including its 2027 dataset, not invented season-specific ratings. The playable seasons remain 2024–2026. Source-file hashes are recorded in data/profile-source.json. Website default labels such as Developing Profile are preserved.

Ratings and styles appear in lineups, clickable squad profiles, the controlled-player HUD and substitutions. **Team OVR** is the rounded average of the current lineup’s website player overalls, limited to 60–99. It appears in team selection, squad details, the intro, the score HUD and substitutions, and updates after lineup changes. It is a derived game value, not a separately published website team rating. Small gameplay modifiers affect running, endurance, shooting, forward runs, passing leads, defending and goalkeeping. Those modifiers are arcade balancing, not additional claimed real-life statistics; difficulty never changes player speed.

Seven 2026 senior uniforms use the user's supplied jersey references: EM blue, Leeward orange fading into navy, Refuel white with blue sleeves, Sharp gold, Rawaha purple, Gangat white with a red center stripe, and Memon green. Patterns, shorts and socks are defined in src/kits.js and rendered with small procedural textures. Supplied photo crops are not published as game assets. These reference kits are preserved when playing against each other. Other season/team colors use supplied colors or a badge-derived palette, with a contrasting CPU kit where needed.

With the requested two-folder layout:

    Lantern Soccer Leauge/
      LSL Website/
        data/
        Logos/
        index.html
        ...
      LSL Game/
        index.html
        src/
        data/
        ...

Refresh the game roster snapshot from its sibling website:

    node scripts/sync-data.mjs "../LSL Website"

Or use any complete LSL website checkout:

    node scripts/sync-data.mjs "C:/path/to/LSL Website"

Future seasons use the same adapter. Once real 2027 rosters exist:

    node scripts/sync-data.mjs "../LSL Website" "2024,2025,2026,2027"

This copies the selected data and available badges and regenerates data/seasons.json. Run the checks before publishing.

## Project structure

- src/engine/ — Three.js renderer, stadium, camera, player models, procedural animations and fixed-step loop.
- src/match/ — players, ball physics, tactical AI, rules, statistics and match state.
- src/input/ — keyboard, rebinding and multitouch joystick/actions.
- src/ui/ — menus, substitutions, result screens, player labels and HUD.
- src/data.js — season loading and lineup selection.
- src/settings.js — validated local preferences and keyboard bindings.
- data/ — portable season snapshots and season manifest.
- assets/ — supplied LSL logo and real team badges.
- vendor/ — Three.js 0.170.0 and its MIT license.
- tests/ — deterministic rules, physics, roster and lifecycle tests.
- scripts/ — local serving, data synchronization and release checks.

## Verification

    node scripts/check.mjs
    node --test tests/*.test.js

Verify the exported ratings and styles against a complete website checkout:

    node scripts/check-profiles.mjs "../LSL Website"

Automated checks cover all season rosters, 14 starters, the intro, acceleration and braking, intermittent dribble touches, exact ball stopping, first touches, first-time passes/volleys, goalkeeper catches/distribution and direction-matched parries, camera persistence/framing, animation poses, charging shots, goals, restarts, posts/crossbar, fouls/cards, substitutions, halftime, changing ends and complete seeded CPU matches across difficulties.

Responsive browser QA includes the main menu, all three seasons, settings, live 3D rendering, keyboard actions, substitution menus and phone-size layouts. Physical iOS/Android hardware should still be checked before a broad public release; desktop emulation does not measure phone GPU performance.

## Performance

Low disables dynamic shadows, grass bump and fabric normal maps, limits pixel ratio to 1, and reduces crowd/scenery detail. Medium uses up to 1.35 pixel ratio and a 1024 shadow map; High uses up to 1.75 and a 2048 shadow map. Only one light casts dynamic shadows. Seats, stands and spectators use instancing; static body pieces merge by joint; kit textures are shared and released after use. Compact layouts can reduce render scale in steps down to 75% after sustained frame rates below 29. Touch devices can also switch to Low. Physics keeps its fixed timestep and inactive tabs pause.

Requires WebGL 2 in a current browser. Network is needed to initially load the static game files; there is no offline caching layer. No audio is created or loaded.


## Matchday visuals

The rebuilt stadium includes open-air seating on four sides, stair aisles and concourses, instanced spectators, team LED boards, a tunnel, dugouts with glass backs, floodlight towers, two live score screens, round metal goal frames and fine net meshes. Corners have animated flags. Goal nets deform near the ball impact and settle with damping; their goalpost attachments remain pinned.

The turf uses original generated textures: 16 mowing bands, grain and blade variation, lightly worn goalmouths and a tiled bump layer. Painted line ribbons retain a physical width and include penalty arcs, corner arcs and technical areas. All artwork is generated locally; there are no copied FC Mobile assets or external texture/model requests.

**Graphics → Match lighting** selects Day, Evening or Night and saves locally. Each mode changes the procedural sky, exposure, light direction, warmth, fill and stadium lamps. ACES tone mapping and physical materials give fabric, skin, grass and metal a consistent response. Low preserves the lighting palette with inexpensive contact shadows.

The original Lantern Rush interface adds kit lineup cards, team badge score overlays, matching goalkeeper colors, goal panels and comparison bars at halftime/full time. Broadcast cameras anticipate ball motion, use compact framing on phones, and blend into close celebration/set-piece views. This remains an optimized browser game with generic character appearances, not real-player face scans or recorded replays.

### Jersey-number provenance

`data/jersey-audit.json` lists every assignment and records source hashes, unavailable values and source conflicts. Current source coverage: 2024 **81/81**, 2025 **115/115**, and 2026 **39/82** known numbers. The 43 unlisted 2026 values stay blank. One conflicting profile and seven duplicate-number groups are flagged; the published team roster has precedence. Numbers from other seasons or representative tournament squads are never silently substituted.

To verify against a fresh website checkout:

    node scripts/check-jerseys.mjs "../LSL Website"

The supplied 2026 number list is recorded in the website rosters and covered by `tests/fixtures/confirmed-jerseys.json`. Abdul Ghiyas Solyman uses #8 in 2024, #1 in 2025, and #7 in 2026. Other players and seasons keep their source numbers, including source duplicates. Player labels, lineup/profile/intro cards, goal and foul notices, assists, substitutions and results use the same name-and-number format. Match events retain the number at the time of the event, even after a substitution.

The regular release check also validates the bundled audit. Update the website's correct season/team roster first, run the sync command, then rerun the checks to publish new numbers.

## Credits

Game identity, code, stadium and character models: original Lantern Rush implementation.
League names, badges and rosters: supplied Lantern Soccer League project.
Three.js: the Three.js authors, MIT license in vendor/THREE-LICENSE.txt.
