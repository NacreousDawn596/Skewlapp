# SkewlApp — Project Reference

> Auto-generated exhaustive reference of this codebase. Read this instead of re-reading every file.

---

## 1. Overview

**SkewlApp** is a professional mobile application for students of **ENSAM-UMI** (École Nationale Supérieure d'Arts et Métiers, Université Mohammed V / Meknès) to interact with the official **SchoolApp** academic portal. It provides real-time access to grades, attendance, sanctions, academic history, a grade simulator, and a virtual student ID card — with robust offline-first caching and background notifications.

| Attribute | Value |
|---|---|
| Name | `skewlapp` |
| Display name | SkewlApp Mobile |
| Version | `5.0.6` |
| Platform | iOS + Android + Web (Expo managed workflow) |
| Language | TypeScript (`strict: true`) |
| License | MIT — Copyright (c) 2026 NacreousDawn596 |
| Authors | Aferiad Kamal & Feddoul Salma |
| GitHub | `https://github.com/NacreousDawn596/SkewlApp` |
| EAS Project ID | `73930e3e-cffd-442f-9402-eb5dbead92e9` |
| EAS Owner | `nacreousdawn596` |
| App scheme | `kimoo.skewlapp` |
| iOS bundle id | `skewlapp.aferiad.kamal` |
| Android package | `skewlapp.aferiad.kamal` |

---

## 2. Tech Stack

### Core
- **Framework:** React Native `0.81.5` (New Architecture enabled — `newArchEnabled: true`)
- **Toolchain:** Expo SDK `~54.0.27` (managed workflow, prebuild via EAS)
- **Routing:** `expo-router` `~6.0.17` (file-based routing, typed routes experiment ON)
- **React:** `19.1.0` (`react-dom` `19.1.0`, `react-native-web` `^0.21.0`)
- **Language:** TypeScript `~5.9.2`

### State / Data
- **React Query** (`@tanstack/react-query` `^5.90.16`) — primary async/server-state cache
- **Context Hooks** (`@nkzw/create-context-hook` `^1.1.0`) — lightweight context providers
- **Zustand** `^5.0.2` — ⚠️ *declared in `package.json` but NOT imported anywhere; effectively a dead dependency* (README claims it's used, it is not)
- **AsyncStorage** (`@react-native-async-storage/async-storage` `2.2.0`) — local persistence
- **SecureStore** (`expo-secure-store` `~15.0.8`) — encrypted credentials (web fallback → `localStorage`)

### Networking / Parsing
- **`schoolapp` npm package `^2.5.2`** — custom API client wrapping the ENSAM SchoolApp portal (cookie auth + HTML scraping). The app's central backend abstraction.
- **`cheerio-without-node-native` `^0.20.2`** — HTML parsing (used by the `schoolapp` package)
- **`axios` `^1.13.2`** — HTTP client (used by `schoolapp`; directly used only in `mockServer/test-mock.js`)
- **`tough-cookie` `^6.0.0`** — cookie jar (used by `schoolapp`)
- **`@ungap/structured-clone` `^1.3.0`**, **`@stardazed/streams-text-encoding` `^1.0.2`** — polyfills for React Native (used by `schoolapp`)
- **`deep-equal` `^2.2.3`** — deep equality (used in `services/changeDetection.ts`)
- **`@react-native-community/netinfo` `11.4.1`** + **`expo-network` `^8.0.8`** — connectivity detection

### Expo Modules
`expo-background-fetch`, `expo-task-manager`, `expo-notifications`, `expo-location`, `expo-local-authentication` (biometrics), `expo-image`, `expo-image-picker`, `expo-blur`, `expo-linear-gradient`, `expo-haptics`, `expo-font`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-web-browser`, `expo-secure-store`.

### UI / Styling
- **`lucide-react-native` `^0.562.0`** — icon library (primary)
- **`@expo/vector-icons` `^15.0.3`** — icon library
- **`react-native-svg` `15.12.1`** — SVG rendering
- **`react-native-qrcode-svg` `^6.3.21`** — QR codes (student card)
- **`react-native-safe-area-context` `~5.6.0`**, **`react-native-screens` `~4.16.0`**, **`react-native-gesture-handler` `~2.28.0`**, **`react-native-worklets` `0.5.1`**
- **`dayjs` `^1.11.19`** — dates (relativeTime plugin used)

### Build / Dev Tooling
- **EAS CLI** `eas-cli ^16.28.0` — builds/submits
- **`patch-package` `^8.0.1`** — postinstall patch hook (⚠️ no `patches/` directory currently present)
- **ESLint** `^9.31.0` + **`eslint-config-expo` `~10.0.0`** (flat config)
- **`@expo/ngrok` `^4.1.0`** — dev tunneling
- **Nix** dev environment (`shell.nix`) — JDK17 + Android SDK (platforms 35/36, build-tools 35.0.0/36.0.0, NDK 27.1.12297006, CMake 3.22.1)

### Mock Server (separate package in `./mockServer`)
- **Express `^5.2.1`**, `body-parser`, `cookie-parser`, `cors` — full HTML-simulation of the SchoolApp portal

---

## 3. Scripts (root `package.json`)

| Command | Purpose |
|---|---|
| `npm start` | `expo start` (Metro dev server) |
| `npm run start-web` | `expo start --web` |
| `npm run start-web-dev` | `DEBUG=expo* expo start --web` |
| `npm run lint` | `expo lint` |
| `npm run android` | `expo run:android` |
| `npm run ios` | `expo run:ios` |
| `npm run postinstall` | `patch-package` |

---

## 4. Directory Structure

```
Skewlapp/
├── api/
│   └── client.ts                 # ApiClient wrapper + schoolAppClient delegation object
├── app/                          # expo-router file-based routes
│   ├── _layout.tsx               # Root stack + providers + biometric lock screen
│   ├── index.tsx                 # Redirect → /(tabs)/home
│   ├── login.tsx                 # Login screen
│   ├── +not-found.tsx            # 404 screen
│   └── (tabs)/
│       ├── _layout.tsx           # Bottom tab navigator (6 tabs)
│       ├── home.tsx              # Dashboard / activity feed
│       ├── notes.tsx             # Grades & academic history + stats modal
│       ├── absences.tsx          # Absences + sanctions
│       ├── calcules.tsx          # Grade simulator
│       ├── settings.tsx          # Settings + hidden dev mode
│       └── utils.tsx             # Study plan / filières / platform status
├── assets/images/                # icon, adaptive-icon, splash-icon, favicon
├── components/
│   └── StudentCardModal.tsx      # Virtual student ID card modal
├── constants/
│   └── colors.ts                 # Legacy/static light colors (mostly unused)
├── contexts/
│   ├── AuthContext.tsx           # Auth state, login/logout, biometric lock
│   └── PollingContext.tsx        # Background polling orchestration
├── services/
│   ├── activity.ts               # Activity feed (AsyncStorage)
│   ├── apiErrorHandler.ts        # UNAUTHORIZED error handling wrappers
│   ├── cache.ts                  # AsyncStorage caching layer
│   ├── changeDetection.ts        # Diff old/new data → ActivityItems
│   ├── notifications.ts          # expo-notifications helpers + dedup
│   ├── pollExecutor.ts           # Single-flight poll mutex
│   └── polling.ts                # Poll settings, endpoints, fetch orchestration
├── themes/
│   ├── ThemeContext.tsx          # Theme + font-size context (useFontScale)
│   └── palettes.ts               # 16 theme palettes
├── types/
│   ├── api.ts                    # Domain type definitions
│   └── schoolapp.d.ts            # Module declaration for `schoolapp` package
├── mockServer/                   # Express mock of SchoolApp portal
│   ├── server.js                 # Mock backend (HTML + JSON)
│   ├── test-mock.js              # CLI to mutate mock grades
│   ├── db.json                   # Mock data persistence
│   └── package.json
├── .github/workflows/release.yml # EAS build + GitHub release on `v*` tags
├── app.json                      # Expo config
├── eas.json                      # EAS build profiles
├── tsconfig.json                 # TS config (path alias `@/*` → `./*`)
├── eslint.config.js              # ESLint flat config (expo)
├── metro.config.js               # Default Expo Metro config
├── shell.nix                     # Nix dev shell (Android SDK)
└── package.json
```

**Path alias:** `@/*` maps to project root (e.g. `@/themes/ThemeContext`).

---

## 5. Navigation / Routing

File-based routing via `expo-router`.

- **`app/_layout.tsx`** — Root `Stack` wrapped in providers:
  `SafeAreaProvider → QueryClientProvider → ThemeProvider → AuthProvider → PollingProvider → GestureHandlerRootView`
  - Screens: `login` (header hidden), `(tabs)` (header hidden)
  - `Stack.screenOptions.headerBackTitle = "Retour"`
- **`app/index.tsx`** — `Redirect` to `/(tabs)/home`
- **`app/login.tsx`** — login; auto-`Redirect` to home when authenticated
- **`app/(tabs)/_layout.tsx`** — `Tabs` (6 tabs, French labels):

| Route | Title | Icon (lucide) |
|---|---|---|
| `home` | Accueil | `Home` |
| `notes` | Notes | `GraduationCap` |
| `absences` | Absences | `CalendarX` |
| `utils` | Utilitaires | `Layers` |
| `calcules` | Calculs | `Calculator` |
| `settings` | Paramètres | `Settings` |

Guard: `_layout.tsx` returns `null` while loading, `Redirect` to `/login` if not authenticated.

**Internal routes pushed programmatically:** `/absences` (with optional `params.tab = "sanctions"`).

---

## 6. API / Backend Integration (`api/client.ts`)

- **Production host:** `https://schoolapp.ensam-umi.ac.ma`
- **Mock host:** `http://192.168.8.131:3000` (hardcoded default; overridable via dev settings)

### `ApiClient` class
- Wraps a `SchoolAppClient` instance from the `schoolapp` package.
- `initFromSettings()` — reads `skewl_poll_settings` from AsyncStorage; if `useMockServer` is true, switches base URL to mock host.
- `setBaseUrl(url)` — recreates the `SchoolAppClient` (re-login required).
- Credential storage via `secureStorage` abstraction (`expo-secure-store` native / `localStorage` web), key `schoolapp_credentials`.
- `isAuthenticated()` → `client.auth.isLoggedIn()`.

### `schoolAppClient` (delegation object)
A hand-rolled delegation object exposing the active client's managers/methods (replaces an unstable JS `Proxy`). Exposes: `auth`, `grades`, `attendance`, `profile`, `courses`, `httpClient`, `baseUrl`, and methods:
`login`, `logout`, `resetSession`, `getProfile`, `getFilieres`, `getAbsences`, `getSanctions`, `getElemNote`, `getCurrentElemNote`, `getModNote`, `getCurrentModNote`, `getAnnee`, `getSemestre`, `getModules`, `getPhoto`.

### Auth flow notes
- The `schoolapp` package uses cookie-based session (`JSESSIONID`) via a central CookieJar (`tough-cookie`).
- The app extracts `JSESSIONID` from the cookie jar and stores it in `profile.session_id` (used for direct avatar fetches).
- Avatar fetched directly: `GET https://schoolapp.ensam-umi.ac.ma/getphoto/{Code}` with `Cookie: JSESSIONID=...` + `Referer` header, returned as base64 data URL (via `FileReader`).

---

## 7. Types (`types/api.ts`)

- `LoginResponse` — `{ success, csrfToken, message? }`
- `UserProfile` — `basic_info` (photo_url, large_photo_url?, full_name, role, welcome_message), `academic_info` (Record), `administrative_info` (`Code`, `Filiere`, `Filière?`, `Niveau`, `Statut`, `Section`, `Groupe`, `Sous Groupe`), `personal_info`, `contact_info`, `family_info`, `download_links?` (`attestation_scolarite`), `session_id?`
- `Element`, `Module`, `Semestre`, `Annee`, `Absence`, `Sanction`, `Filiere` — generic domain interfaces (mostly `[key: string]: unknown` index signatures)
- `ASFData` — `{ annees, semestres, filieres }`
- `GetModulesRequest` — `{ annee, semestre, filiere }`
- `ActivityItem` — `{ id, type: "note"|"absence"|"sanction"|"update", title, description, timestamp, route? }`

`types/schoolapp.d.ts` — ambient module declaration for `schoolapp` (`SchoolAppClient` class, `login`, `getProfile`, `getFilieres`, `getAbsences`, `getSanctions`, `getElemNote`, `getCurrentElemNote`, `getModNote`, `getCurrentModNote`, `getAnnee`, `getSemestre`, `getModules`, `auth` manager).

---

## 8. State Management & Contexts

### AuthContext (`contexts/AuthContext.tsx`)
Exposes: `isAuthenticated`, `profile`, `isLoading`, `login`, `logout`, `handleUnauthorized`, `loginError`, `isLoggingIn`, `hasAttemptedAutoLogin`, `isLocked`, `setIsLocked`, `unlock`, `isGradePrivacyEnabled`, `setIsGradePrivacyEnabled`, `isBiometricLockEnabled`, `setIsBiometricLockEnabled`.

Key behavior:
- **Startup auth check** (`checkAuthQuery`): tries stored credentials (online) → falls back to stored profile (offline). Stores profile JSON in secure storage (key `profile`).
- **Login** (online only, via `loginMutation`): `schoolAppClient.login` → `getProfile` → extract `JSESSIONID` → save credentials + profile → `clearAllCache()`.
- **Logout**: clears credentials, profile, and cache.
- **Silent re-auth** (`attemptSilentReauth`): re-login with saved credentials; offline → keep cached session.
- **Centralized UNAUTHORIZED handler** (`handleUnauthorized`): if offline, ignore; else try silent re-auth; else force logout.
- **Biometric lock** (`expo-local-authentication`): locked at startup if `biometricLock` setting is on; re-locks on app background; `unlock()` uses `authenticateAsync`.

### PollingContext (`contexts/PollingContext.tsx`)
Exposes: `isPolling`, `lastPollTime`, `startPolling`, `stopPolling`, `poll(silent?)`.

- Defines background task `background-poll-task` (`expo-task-manager` + `expo-background-fetch`), guarded by module-level `backgroundPollRunning` flag. Background polls use `pollEssentialEndpoints(true)`.
- `poll()` is single-flight via `runSinglePoll` mutex.
- **Self-correcting timeout pattern** (recursive `setTimeout` re-reading settings each cycle, more resilient than `setInterval`).
- `registerBackgroundTask` sets minimum interval = `max(interval*60, 60)` secs, `stopOnTerminate: false`, `startOnBoot: true`, and starts Android foreground service.
- Network-gated start (only when `isConnected && isInternetReachable`), re-poll on reconnect after 3s debounce.

### ThemeContext (`themes/ThemeContext.tsx`)
Exposes: `theme`, `fontSize`, `setTheme`, `setFontSize`, `isLoading`.
- Persists theme name to AsyncStorage (`skewl_theme`), font size (`skewl_font_size`).
- `useFontScale()` → 0.85 / 1 / 1.15 / 1.3 for `small`/`normal`/`large`/`xl`.
- `useScaledSize(size)` → `size * scale`.

---

## 9. Theming (`themes/palettes.ts`)

`ThemePalette` interface: `{ name, background, surface, primary, accent, text, muted }`.

16 predefined palettes (`DEFAULT_THEME` = first = "Noir Luxe"):

| # | Name | Accent |
|---|---|---|
| 1 | Noir Luxe | `#8AB4FF` |
| 2 | Graphite Minimal | `#4EA1FF` |
| 3 | Charcoal Slate | `#7BE495` |
| 4 | Midnight Chrome | `#FF8C69` |
| 5 | Obsidian Gold | `#FFD89A` |
| 6 | Ink Blue | `#53E0C9` |
| 7 | Slate Green | `#6FD3B3` |
| 8 | Smoky Lavender | `#A78BFA` |
| 9 | Steel Edge | `#00C2FF` |
| 10 | Warm Ember | `#FF6B6B` |
| 11 | Moonstone Light | `#6B8CFF` |
| 12 | Ivory Calm | `#8DC6FF` |
| 13 | Cream & Clay | `#FFB84D` |
| 14 | Nordic Dawn | `#2AC4B3` |
| 15 | Platinum | `#7B7BFF` |
| 16 | Deep Velvet | `#D97BFF` |

---

## 10. Services Detail

### `services/polling.ts` (core orchestration)
- **`PollEndpoint`** union: `"currentElems" | "currentMods" | "allElems" | "allMods" | "semestres" | "annees" | "absences" | "sanctions" | "filieres"`.
- **`PollSettings`**: `interval` (default 45), `notifyNotes`, `notifyAbsences`, `notifySanctions`, `notificationsEnabled`, `enabled`, `useMockServer`, `biometricLock`, `gradePrivacy` (all booleans default true except last three false).
- Settings persisted in AsyncStorage key `skewl_poll_settings`.
- **`fetchMap`**: maps each endpoint → `schoolAppClient` method.
- **`fetchDependencies`**: `currentMods→[semestres]`, `semestres→[annees]`, `absences→[sanctions]`.
- **`fetchOnceEndpoints`**: `allElems, allMods, semestres, annees, sanctions, filieres` (fetched once, cached "forever" unless dependent changes/forced).
- **`lastFetchTime`**: per-endpoint fetch timestamps.
- **`pollEndpoint`**: fetch → `cleanData` → compare with cache (length check first, then JSON stringify) → `detectChanges` → notify+activity (only for "real-time" endpoints: `currentElems`, `currentMods`, `absences`, `sanctions`) → cache → update `lastFetchTime`. Guards against empty-response overwriting non-empty cache.
- **`pollAllEndpoints`**: sequential fetch with 30ms "breathers" between endpoints to avoid JS thread saturation; returns whether anything changed.
- **`pollEssentialEndpoints`**: only `currentElems` + `absences` (background use).
- **Foreground service**: `expo-location` `startLocationUpdatesAsync` (Android) keeps process alive; tasks `background-keep-alive-task`.

### `services/cache.ts`
- `CACHE_PREFIX = "skewl_cache_"`, `MODULES_CACHE_PREFIX = "skewl_modules_"`, `NAMES_CACHE_KEY = "skewl_element_names_forever"`, `CALCULATOR_STATE_KEY = "skewl_calculator_state"`, `ACTIVITY_KEY = "skewl_activity"`.
- `getCachedData` / `setCachedData` (by endpoint), `getCachedModules` / `setCachedModules` (by niveau/filiere/semestre), `getCachedElementNames` / `setCachedElementNames` (permanent name mapping).
- `cleanData` — recursive removal of `client` and `_stats` keys (prevents circular refs before JSON serialization).
- Calculator cache: root state + per-selection snapshots (`modulesLookup`, `currentElems`, `historyElems`, `userMarks`, `elementNames`, `updatedAt`).
- `buildCalculatorElementNames` — builds `{code → intitule}` map from modules.
- `clearAllCache` — removes all `skewl_cache_*`, `skewl_activity`, `calc_storage_*`, and calculator state keys.

### `services/changeDetection.ts`
- `detectChanges(endpoint, oldData, newData, settings)` → `ActivityItem[]`.
- For grade endpoints (`currentElems`, `allElems`, `currentMods`, `allMods`): builds a Map keyed by `CodeElem`/`CodeMod`, detects **new items** and **changed values** (including null→value initialization).
- `getVal` parses comma decimals (`15,50` → `15.5`), treats `"--"`/`"null"`/empty as `null`.
- Absences: detects new entries (by length comparison). Sanctions: uses `deepEqual`.
- Semestres/annees/currentMods/allMods also emit a generic "Data Updated" update.

### `services/notifications.ts`
- Configures notification handler (alert/sound/badge/banner/list).
- `requestNotificationPermissions()` — requests perms; Android channel `default` (importance MAX).
- `scheduleNotification(title, body, data)` — in-memory dedup (10s window, keyed by `title|body`, cache max 50 entries).

### `services/activity.ts`
- Activity feed stored in AsyncStorage (`skewl_activity`), max 50 items, newest-first. `addActivity`, `getActivityFeed`, `clearActivityFeed`.

### `services/pollExecutor.ts`
- Module-level single-flight mutex: `runSinglePoll(fn)` reuses an in-flight promise.

### `services/apiErrorHandler.ts`
- `isUnauthorizedError(e)` → `e?.message === "UNAUTHORIZED"`.
- `withAuthErrorHandler(fn, onUnauthorized)` and `withReactQueryAuthHandler(fn, onUnauthorized)` — wrappers that call the handler on UNAUTHORIZED then re-throw.

---

## 11. Screens Detail

### Home (`app/(tabs)/home.tsx`)
- NetInfo offline banner ("Vous êtes hors ligne").
- Gradient header with avatar (authenticated fetch, 24h cache), first name, code badge, "last updated" relative time, notification toggle button.
- 3 stat cards: **Scolarité** (opens `attestation_scolarite` PDF via `Linking`), **Absences** (count), **Sanctions** (status text).
- Academic info card (Filière, Niveau, Section/Groupe).
- Recent updates activity feed (max 5 shown, "Effacer" clears).
- React Query keys: `activity`, `absences_summary`, `sanctions_summary`, `pollingSettings`, `avatar`.
- Grade privacy: masks `activity.description` with `••••` when enabled.

### Notes (`app/(tabs)/notes.tsx`)
- 6 categories (menu grid): `currentElems`, `currentMods`, `allElems`, `allMods`, `semestres`, `annees`.
- `NoteElementItem`, `NoteModuleItem`, `NoteSummaryItem` renderers.
- Grade grid for elements: CC, EX, TP, SO, RAT, MOY.
- Module name mapping via `schoolAppClient.getModules(niveau, filiere, semestre)` (cached names).
- Stats modal (`element_stats` query): `ccStats()`, `exStats()`, `tpStats()`, `moyStats()` on element; `stats()` on module.
- BackHandler support for nested navigation + stats modal.
- `getNiveauFromSemestre`, `getSemesterFromCode`, `getVal`, `getDisplayName` helpers.

### Absences (`app/(tabs)/absences.tsx`)
- Two tabs: ABSENCES / SANCTIONS (via `useLocalSearchParams().tab`).
- `AbsenceItem` (justified/unjustified), `SanctionHeader` (status + count), `SanctionItem`.
- Module name mapping for absence elements.

### Calcules / Simulator (`app/(tabs)/calcules.tsx`)
- Selectors: niveau (1A–5A), semestre (S1/S2), filière.
- Module accordion with element mark inputs (CC/TP/EX).
- Weighted average calculation (`coef_cc`, `coef_ex`, `coef_tp`, `coef_ecrit`, `coef_elem`), RATT override logic.
- Marks persisted per-selection in secure storage (`calc_storage_{niveau}_{filiere}_{semestre}`) + calculator snapshot cache.
- `getStatusColor`: ≥12 green, ≥10 yellow, else red.
- Animated GPA footer (BlurView).

### Utils (`app/(tabs)/utils.tsx`)
- 3 utilities: **Plan d'étude** (module library w/ VH, Coef, Seuil, Eliminatoire), **Filières** (list), **État de la plateforme** (HEAD request to SchoolApp, latency, 15s refetch interval).

### Settings (`app/(tabs)/settings.tsx`)
- Appearance: theme picker (16 palettes), font-size picker (small/normal/large/xl).
- Privacy/utilities: Student Card modal, biometric lock toggle, grade privacy toggle.
- Refresh: enabled toggle, interval input (1–360 mins).
- Notifications: master toggle + per-type (notes, absences, sanctions).
- **Hidden Developer Mode**: tap "Paramètres" title 7× to reveal → mock server toggle + host input. Toggling swaps `apiClient.setBaseUrl` and clears React Query cache.
- Logout, GitHub link, credits.

---

## 12. Mock Server (`./mockServer`)

Express app on port `3000` (binds `0.0.0.0`), simulating the SchoolApp portal's exact HTML structure for parser testing.

- **Auth:** cookie `JSESSIONID = MOCK_SESS_12345`; `checkAuth` middleware.
- **Latency:** random 50–250ms delay on all requests.
- **Persistence:** `db.json` (auto-generated on first run if missing).
- **Endpoints:** `/login` (GET/POST), `/index` (profile), `/plan-etudes-view/filieres`, `/plan-etudes-view/modules`, `/student/noteselem-encours`, `/student/notesmod-encours`, `/notes-stat/elemevalsat` (stats), `/student/absence/bilan`, `/student/absence/sanctions`, `/student/noteselem`, `/student/notesmod`, `/student/notessem`, `/student/notesannee`.
- **Mock control:** `POST /mock/update-grade`, `POST /mock/add-element`.
- **CLI** (`test-mock.js`): `node test-mock.js update <CodeElem> <Grade>` / `node test-mock.js add <CodeElem> <Name> <Grade>`.

---

## 13. Configuration Files

### `app.json` (Expo)
- `newArchEnabled: true`, `userInterfaceStyle: automatic`, `orientation: portrait`, `experiments.typedRoutes: true`.
- iOS: `supportsTablet: false`, `UIBackgroundModes: [fetch]`, FaceID usage description, `usesNonExemptEncryption: false`.
- Android permissions: `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`.
- Plugins: `expo-router`, `expo-font`, `expo-web-browser`, `expo-background-fetch`, `expo-task-manager`, `expo-secure-store` (configureAndroidBackup, faceIDPermission), `expo-notifications` (icon, color, channel `default`, no sounds, no background remote notifs).
- `extra.router.origin = "https://kamal.aferiad.com/"`.

### `eas.json`
- CLI `>= 16.28.0`, `appVersionSource: remote`.
- Profiles: `development` (dev client, internal, APK), `preview` (internal, APK), `production` (autoIncrement, AAB). Submit: production.

### `.github/workflows/release.yml`
- Trigger: push tag `v*`.
- Job `build-android`: checkout, Node 20, `npm install --legacy-peer-deps`, EAS preview APK + production AAB (JSON output), download artifacts, upload.
- Job `create-release`: downloads artifacts, creates GitHub release (APK + AAB) via `softprops/action-gh-release@v2`.
- Requires secrets: `EXPO_TOKEN`, `GITHUB_TOKEN`.

### `shell.nix`
- Nix dev shell with JDK17 + Android SDK (platform 35/36, build-tools 35.0.0/36.0.0, NDK 27.1.12297006, CMake 3.22.1), no emulator/system images.

---

## 14. Key Implementation Notes / Gotchas

- **French localization** throughout UI (labels, notifications).
- **Grade parsing** handles French comma decimals (`"15,50"`), values `"--"`/`"null"` treated as ungraded.
- **Passing threshold**: grade ≥ 11 (out of 20) or `gradeStr === "V"` = passing; green `#6BCB77`, else accent color.
- **Privacy masking**: `isGradePrivacyEnabled` masks grade values with `••`.
- **Offline-first**: all data cached in AsyncStorage; screens read from cache (`getCachedData`), never directly from network except via polling.
- **Deduplication**: two layers (changeDetection Map-based diff + notification 10s in-memory dedup) to prevent duplicate notifications.
- **JSESSIONID** extracted from cookie jar for direct authenticated image fetch (avatar/photo).
- **`getSemesterFromCode`**: derived from module/element code digits (ENAM convention; e.g. `M3101`), `S10` special case.
- **`getNiveauFromSemestre`**: S1–S2→1A, S3–S4→2A, S5–S6→3A, S7–S8→4A, S9+→5A.
- **Dead/unused:** `zustand` (declared, unused), `constants/colors.ts` (legacy static colors, referenced nowhere meaningful).
- **`cleanData`** strips `client` and `_stats` keys to avoid circular JSON serialization failures when caching `schoolapp` response objects.
- **LayoutAnimation** removed from Notes category switch to avoid Android native crashes on complex lists.
- **BackHandler** manually handled in Notes/Utils for nested navigation + modals.

---

## 15. Build / Release Workflow

1. Local dev: `npm start` (Metro), `npm run android`/`npm run ios` (prebuild run), `npm run start-web`.
2. Lint: `npm run lint`.
3. EAS builds: `development` / `preview` / `production` profiles.
4. Tag release: push a `v*` tag → GitHub Actions builds APK + AAB and publishes a GitHub release with artifacts.

---

## 16. Changelog Highlights (from README, v5.1.0)

- Fixed grade detection for comma decimals.
- Explicit "Grade Initialization" (null→value) handling.
- Two-layer notification deduplication.
- `useEffect` sync hooks for immediate UI refresh after background polls.
- Pull-to-refresh on Grade Simulator.
- Ultimate Realism Mock Server integration.
- Hidden Developer Mode (host-switching).
- Localized notifications to French.
- Biometric lock, student card, privacy masking (from git history).
