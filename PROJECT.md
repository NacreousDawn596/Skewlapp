# SkewlApp — Project Reference

> Auto-generated exhaustive reference of this codebase. Read this instead of re-reading every file.
>
> **Last updated for v5.1.1.**

---

## 1. Overview

**SkewlApp** is a professional mobile application for students of **ENSAM-UMI** (École Nationale Supérieure d'Arts et Métiers, Université Mohammed V / Meknès) to interact with the official **SchoolApp** academic portal. It provides real-time access to grades, attendance, sanctions, academic history, a grade simulator, and a virtual student ID card — with robust offline-first caching and background notifications.

| Attribute | Value |
|---|---|
| Name | `skewlapp` |
| Display name | SkewlApp Mobile |
| Version | `5.1.1` (`versionCode 50101`) |
| Platform | iOS + Android + Web (Expo managed workflow) |
| Language | TypeScript (`strict: true`) |
| License | MIT — Copyright (c) 2026 Aferiad Kamal |
| Author | Aferiad Kamal — kamal@aferiad.com |
| GitHub | `https://github.com/NacreousDawn596/SkewlApp` |
| EAS Project ID | `a82e5c79-9e69-4926-bc8f-9e22f17e7372` |
| EAS Owner | `kiimooo` |
| App scheme | `kimoo.skewlapp` |
| iOS bundle id | `skewlapp.aferiad.kamal` |
| Android package | `skewlapp.aferiad.kamal` |

---

## 2. Tech Stack

### Core
- **Framework:** React Native `0.81.5` (New Architecture enabled — `newArchEnabled: true`)
- **Toolchain:** Expo SDK `~54.0.27` (managed workflow)
- **Routing:** `expo-router` `~6.0.17` (file-based routing, typed routes ON)
- **React:** `19.1.0` (`react-dom` `19.1.0`, `react-native-web` `^0.21.0`)
- **Language:** TypeScript `~5.9.2`

### State / Data
- **React Query** (`@tanstack/react-query` `^5.90.16`) — primary async/server-state cache
- **Context Hooks** (`@nkzw/create-context-hook` `^1.1.0`) — lightweight context providers
- **AsyncStorage** (`@react-native-async-storage/async-storage` `2.2.0`) — local persistence
- **SecureStore** (`expo-secure-store` `~15.0.8`) — encrypted credentials (web fallback → `localStorage`)

### Networking / Parsing
- **`schoolapp` npm package `^2.5.2`** — custom API client wrapping the ENSAM SchoolApp portal (cookie auth + HTML scraping). The app's central backend abstraction.
- **`cheerio-without-node-native` `^0.20.2`** — HTML parsing (used by the `schoolapp` package)
- **`axios` `^1.13.2`** — HTTP client (used by `schoolapp`)
- **`tough-cookie` `^6.0.0`** — cookie jar (used by `schoolapp`)
- **`@ungap/structured-clone` `^1.3.0`**, **`@stardazed/streams-text-encoding` `^1.0.2`** — polyfills for React Native (used by `schoolapp`)
- **`deep-equal` `^2.2.3`** — deep equality (used in `services/changeDetection.ts`)
- **`@react-native-community/netinfo` `11.4.1`** + **`expo-network` `^8.0.8`** — connectivity detection

### Expo Modules
`expo-background-fetch`, `expo-task-manager`, `expo-notifications`, `expo-location`, `expo-local-authentication` (biometrics), `expo-image`, `expo-blur`, `expo-linear-gradient`, `expo-haptics`, `expo-font`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `expo-web-browser`, `expo-secure-store`.

### UI / Styling
- **`lucide-react-native` `^0.562.0`** — icon library (only icon library)
- **`react-native-svg` `15.12.1`** — SVG rendering (trend chart)
- **`react-native-qrcode-svg` `^6.3.21`** — QR codes (student card)
- **`react-native-safe-area-context` `~5.6.0`**, **`react-native-screens` `~4.16.0`**, **`react-native-gesture-handler` `~2.28.0`**, **`react-native-worklets` `0.5.1`**
- **`dayjs` `^1.11.19`** — dates (relativeTime plugin used)

### Build / Dev / Test Tooling
- **EAS CLI** `eas-cli ^16.28.0` — cloud builds/submits
- **`patch-package` `^8.0.1`** — postinstall patch hook (no `patches/` directory present)
- **ESLint** `^9.31.0` + **`eslint-config-expo` `~10.0.0`** (flat config)
- **Vitest** `^3.2.4` — unit tests (dev-only)
- **`@expo/ngrok` `^4.1.0`** — dev tunneling
- **Nix** dev environment (`shell.nix`) — JDK17 + Android SDK (platforms 35/36, build-tools 35.0.0/36.0.0, NDK 27.1.12297006, CMake 3.22.1)

---

## 3. Scripts (root `package.json`)

| Command | Purpose |
|---|---|
| `npm start` | `expo start` (Metro dev server) |
| `npm run start-web` | `expo start --web` |
| `npm run start-web-dev` | `DEBUG=expo* expo start --web` |
| `npm run lint` | `expo lint` |
| `npm test` | `vitest run` |
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
│   ├── _layout.tsx               # Root stack + providers + biometric lock + notification deep-linking
│   ├── index.tsx                 # Redirect → /(tabs)/home
│   ├── login.tsx                 # Login screen
│   ├── +not-found.tsx            # 404 screen
│   └── (tabs)/
│       ├── _layout.tsx           # Bottom tab navigator (6 tabs)
│       ├── home.tsx              # Dashboard / activity feed
│       ├── notes.tsx             # Grades + academic history + trend chart + stats modal
│       ├── absences.tsx          # Absences + sanctions
│       ├── calcules.tsx          # Grade simulator (reset button)
│       ├── settings.tsx          # Settings (theme, haptics, refresh, notifications)
│       └── utils.tsx             # Study plan / filières / platform status
├── assets/images/                # icon, adaptive-icon, splash-icon, favicon
├── components/
│   ├── GradeTrendChart.tsx       # SVG semester-average trend chart
│   └── StudentCardModal.tsx      # Virtual student ID card modal
├── contexts/
│   ├── AuthContext.tsx           # Auth state, login/logout, biometric lock
│   └── PollingContext.tsx        # Background polling + historical refresh orchestration
├── services/
│   ├── activity.ts               # Activity feed (AsyncStorage)
│   ├── apiErrorHandler.ts        # UNAUTHORIZED error handling wrappers
│   ├── cache.ts                  # AsyncStorage caching layer + unresolved-name tracking
│   ├── changeDetection.ts        # Identity-based diff old/new → ActivityItems
│   ├── grades.ts                 # Pure grade math (RATT, thresholds, averages, simulator)
│   ├── haptics.ts                # Centralized haptics utility (intensity mapping)
│   ├── notificationNavigation.ts # Notification deep-link allowlist + parser
│   ├── notifications.ts          # expo-notifications helpers + dedup
│   ├── pollExecutor.ts           # Single-flight poll mutex
│   └── polling.ts                # Poll settings, endpoints, historical scheduler
├── themes/
│   ├── ThemeContext.tsx          # Theme + font-size context (follow-system support)
│   └── palettes.ts               # 16 theme palettes + system-theme resolution
├── types/
│   ├── api.ts                    # Domain type definitions
│   └── schoolapp.d.ts            # Complete ambient declaration for `schoolapp` package
├── tests/                        # Vitest unit tests (pure functions)
│   ├── grades.test.ts
│   ├── detection.test.ts
│   └── notificationNavigation.test.ts
├── app.json                      # Expo config
├── eas.json                      # EAS build profiles
├── tsconfig.json                 # TS config (path alias `@/*` → `./*`)
├── eslint.config.js              # ESLint flat config (expo)
├── metro.config.js               # Default Expo Metro config
├── shell.nix                     # Nix dev shell (Android SDK)
├── CHANGELOG.md                  # Release history (Keep a Changelog)
├── README.md
└── package.json
```

**Path alias:** `@/*` maps to project root (e.g. `@/themes/ThemeContext`).

**Note:** `android/` (generated by `expo prebuild`) is gitignored and holds the release keystore (`android/app/release.keystore` + `keystore.properties`) — **back these up**, they are not in git.

---

## 5. Navigation / Routing

File-based routing via `expo-router`.

- **`app/_layout.tsx`** — Root `Stack` wrapped in providers:
  `SafeAreaProvider → QueryClientProvider → ThemeProvider → AuthProvider → PollingProvider → GestureHandlerRootView`
  - Screens: `login` (header hidden), `(tabs)` (header hidden)
  - `Stack.screenOptions.headerBackTitle = "Retour"`
  - **Notification deep-linking:** registers `addNotificationResponseListener` + cold-start `getLastNotificationResponseAsync`, validates against an allowlist (`/notes`, `/absences`), dedupes by notification id, and retains a pending destination behind the biometric lock until navigation is ready.
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

- **Production host:** `https://schoolapp.ensam-umi.ac.ma` (no mock/dev environment anymore)

### `ApiClient` class
- Wraps a `SchoolAppClient` instance from the `schoolapp` package.
- Credential storage via `secureStorage` abstraction (`expo-secure-store` native / `localStorage` web), key `schoolapp_credentials`.
- `isAuthenticated()` → `client.auth.isLoggedIn()`.

### `schoolAppClient` (delegation object)
A hand-rolled delegation object exposing the active client's managers/methods (replaces an unstable JS `Proxy`). Exposes: `auth`, `grades`, `attendance`, `profile`, `courses`, `httpClient`, `baseUrl`, and methods:
`login`, `logout`, `resetSession`, `getProfile`, `getFilieres`, `getAbsences`, `getSanctions`, `getElemNote`, `getCurrentElemNote`, `getModNote`, `getCurrentModNote`, `getAnnee`, `getSemestre`, `getModules`.

(`getPhoto` was removed — the app uses a raw authenticated `fetch` for photos.)

### Auth flow notes
- The `schoolapp` package uses cookie-based session (`JSESSIONID`) via a central CookieJar (`tough-cookie`).
- The app extracts `JSESSIONID` from the cookie jar and stores it in `profile.session_id` (used for direct avatar fetches).
- Avatar fetched directly: `GET https://schoolapp.ensam-umi.ac.ma/getphoto/{Code}` with `Cookie: JSESSIONID=...` + `Referer` header, returned as base64 data URL (via `FileReader`).

---

## 7. Types

### `types/api.ts`
- `LoginResponse`, `UserProfile` (basic/academic/administrative/personal/contact/family info, download_links, session_id), `Element`, `Module`, `Semestre`, `Annee`, `Absence`, `Sanction`, `Filiere`, `ASFData`, `GetModulesRequest`, `ActivityItem`.

### `types/schoolapp.d.ts`
Complete ambient declaration for the `schoolapp` package: `SchoolAppClient`, `HTTPClient`, `AuthManager`, `GradesManager`, `AttendanceManager`, `ProfileManager`, `CourseManager`, `Element`, `Module`, `Semestre`, `Annee`, `CookieJar`, `ModuleInfo`/`ElementInfo`, `ModulesData`. (Intentionally does **not** declare `getPhoto`.)

### `services/grades.ts` (pure math types)
`Niveau`, `toGradeNumber`, `getPassingThreshold`, `ElementCoefficients`, `computeElementAverage`, `computeElementAverageWithRatt`, `computeModuleAverage`, `computeGlobalAverage`, `BaselineResult`, `UserMarks`, `ModuleLookup`, `SimulatorElement/Module/Result`, `computeSimulatorResult`, `TrendPoint`, `semesterValue`, `buildSemesterTrend`.

---

## 8. State Management & Contexts

### AuthContext (`contexts/AuthContext.tsx`)
Exposes: `isAuthenticated`, `profile`, `isLoading`, `login`, `logout`, `handleUnauthorized`, `loginError`, `isLoggingIn`, `hasAttemptedAutoLogin`, `isLocked`, `setIsLocked`, `unlock`, `isGradePrivacyEnabled`, `setIsGradePrivacyEnabled`, `isBiometricLockEnabled`, `setIsBiometricLockEnabled`.

- **Startup auth check** (`checkAuthQuery`): tries stored credentials (online) → falls back to stored profile (offline). Stores profile JSON in secure storage (key `profile`).
- **Login** (online only): `schoolAppClient.login` → `getProfile` → extract `JSESSIONID` → save credentials + profile → `clearAllCache()`.
- **Logout**: clears credentials, profile, and cache.
- **Silent re-auth** (`attemptSilentReauth`): re-login with saved credentials; offline → keep cached session.
- **Centralized UNAUTHORIZED handler** (`handleUnauthorized`): if offline, ignore; else try silent re-auth; else force logout.
- **Biometric lock** (`expo-local-authentication`): locked at startup if `biometricLock` is on; re-locks on app background; `unlock()` uses `authenticateAsync`.

### PollingContext (`contexts/PollingContext.tsx`)
Exposes: `isPolling`, `lastPollTime`, `startPolling`, `stopPolling`, `poll(silent?)`.

- Defines background task `background-poll-task` (`expo-task-manager` + `expo-background-fetch`), guarded by module-level `backgroundPollRunning` flag. Background polls use `pollEssentialEndpoints(true)` and opportunistically run the historical scheduler.
- `poll()` is single-flight via `runSinglePoll` mutex; **`lastPollTime` updates after every successful sync** (silent included).
- **Self-correcting timeout pattern** (recursive `setTimeout` re-reading settings each cycle).
- `registerBackgroundTask` sets minimum interval = `max(interval*60, 60)` secs, `stopOnTerminate: false`, `startOnBoot: true`, and starts the Android foreground service.
- **Historical refresh** (`checkHistoricalRefresh`): runs `runHistoricalRefresh()` when `isHistoricalRefreshDue()` (default 72h) — on startup, foreground, and background fetch.
- Network-gated start, re-poll on reconnect after 3s debounce.

### ThemeContext (`themes/ThemeContext.tsx`)
Exposes: `theme` (resolved palette), `themeName` (preference: `"system"` or a palette name), `fontSize`, `setTheme`, `setFontSize`, `isLoading`.
- **Follow-system support** via `useColorScheme()`; `resolveTheme()` maps `"system"` → `DEFAULT_LIGHT_THEME`/`DEFAULT_DARK_THEME`.
- Persists theme name to AsyncStorage (`skewl_theme`), font size (`skewl_font_size`).
- `useFontScale()` → 0.85 / 1 / 1.15 / 1.3 for `small`/`normal`/`large`/`xl`; `useScaledSize(size)` → `size * scale`.

---

## 9. Theming (`themes/palettes.ts`)

`ThemePalette` interface: `{ name, background, surface, primary, accent, text, muted }`.

16 predefined palettes + `SYSTEM_THEME = "system"`:
- **Dark default:** "Noir Luxe"; **Light default:** "Moonstone Light".
- `resolveTheme(name, scheme)`, `isDarkPalette(palette)`.

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

### `services/grades.ts` (pure math — single source of truth)
- `toGradeNumber(value)` — comma-decimal-aware parser; `null` for absent, `0` for explicit zero.
- `getPassingThreshold(niveau)` — **11** for `1A`/`2A`, **12** for `3A`/`4A`/`5A`/unknown.
- `computeElementAverage(cc, ex, tp, coefs)` — normal element average using the `coef_ecrit` grouping (written = CC+EX sub-averaged, then weighted vs TP).
- `computeElementAverageWithRatt(cc, ex, tp, ratt, coefs)` — **four-candidate RATT formula**: `min(11, max(N(CC,TP,EX), N(CC,TP,RATT), N(RATT,TP), N(RATT)))`; no cap when RATT is absent.
- `computeModuleAverage`, `computeGlobalAverage`.
- `computeSimulatorResult(modulesLookup, resultsMap, userMarks)` — full simulator (module + global averages), reused by the simulator screen.
- `buildSemesterTrend(semestres)` + `semesterValue(item)` — trend-chart data shaping.

### `services/polling.ts` (core orchestration)
- **`PollEndpoint`** union: `currentElems | currentMods | allElems | allMods | semestres | annees | absences | sanctions | filieres`.
- **`PollSettings`**: `interval` (default 45 min), `notifyNotes`, `notifyAbsences`, `notifySanctions`, `notificationsEnabled`, `enabled`, `biometricLock`, `gradePrivacy`, `hapticsEnabled`, `hapticsIntensity` (0–5, default 3), `historicalRefreshInterval` (hours, default **72**). Persisted in `skewl_poll_settings`.
- **`fetchMap`**, **`fetchDependencies`**, **`fetchOnceEndpoints`** (allElems/allMods/semestres/annees/sanctions/filieres), **`lastFetchTime`**.
- **`pollEndpoint`**: fetch → `cleanData` → diff → `detectChanges` → notify+activity (real-time endpoints, or historical endpoints during scheduled refresh) → cache.
- **`pollAllEndpoints`**: sequential with 30ms "breathers". **`pollEssentialEndpoints`**: `currentElems` + `absences`.
- **Historical scheduler**: `HISTORICAL_ENDPOINTS`, `getHistoricalLastRefresh`/`setHistoricalLastRefresh`, `isHistoricalRefreshDue()`, `runHistoricalRefresh()` (single-flight, updates timestamp only on success).
- **Foreground service**: `expo-location` `startLocationUpdatesAsync` (Android) — task `background-keep-alive-task`.

### `services/changeDetection.ts` (identity-based)
- `detectChanges(endpoint, oldData, newData, settings)` → `ActivityItem[]`.
- `detectGradeChanges` (notes), `detectAbsenceChanges` (identity = element+date+session; detects new/changed justification), `detectSummaryChanges` (semesters/years), sanctions via `deepEqual`.
- Exported testable helpers: `absenceIdentity`, `absenceStatus`, `absenceSignature`.

### `services/haptics.ts` (centralized)
- Module-level config via `configureHaptics(enabled, intensity)`; read at app start and on settings change.
- `HAPTICS_LEVELS` (0–5), `DEFAULT_HAPTICS_ENABLED = true`, `DEFAULT_HAPTICS_INTENSITY = 3`.
- `hapticImpact()` — iOS uses impact styles, **Android uses distinct vibration durations** (20/40/65/95/140 ms) so intensity actually differs. `hapticSelection`, `hapticSuccess`, `hapticError`, `hapticTest`.

### `services/notificationNavigation.ts`
- `ALLOWED_NOTIFICATION_ROUTES = ["/notes", "/absences"]`.
- `parseNotificationRoute(data)` — validates the route (and optional `tab`) against the allowlist; returns `{ pathname, tab }` or `null`.

### `services/cache.ts`
- `CACHE_PREFIX`, `MODULES_CACHE_PREFIX`, `NAMES_CACHE_KEY`, `CALCULATOR_STATE_KEY`, `ACTIVITY_KEY`, `UNRESOLVED_NAMES_KEY`.
- `getCachedData`/`setCachedData`, `getCachedModules`/`setCachedModules`, `getCachedElementNames`/`setCachedElementNames`, `findUnresolvedCodes`/`setUnresolvedNameCodes`.
- `cleanData` strips `client`/`_stats`; calculator snapshot cache; `clearAllCache`.

### `services/notifications.ts`, `services/activity.ts`, `services/pollExecutor.ts`, `services/apiErrorHandler.ts`
- Notifications: handler config, `requestNotificationPermissions`, `scheduleNotification` (10s in-memory dedup), `addNotificationResponseListener`.
- Activity: feed in AsyncStorage (`skewl_activity`), max 50, newest-first.
- `runSinglePoll` single-flight mutex.
- `isUnauthorizedError`, `withAuthErrorHandler`, `withReactQueryAuthHandler`.

---

## 11. Screens Detail

### Home (`app/(tabs)/home.tsx`)
- NetInfo offline banner; gradient header with avatar (authenticated fetch, 24h cache), name, code badge, "last updated", notification toggle.
- 3 stat cards (Scolarité / Absences / Sanctions); academic info card; recent-updates feed (max 5).
- Grade privacy masks descriptions with `••••`.

### Notes (`app/(tabs)/notes.tsx`)
- 6 categories: `currentElems`, `currentMods`, `allElems`, `allMods`, `semestres`, `annees`.
- **Trend chart** (`GradeTrendChart`) shown above the menu, built from `buildSemesterTrend(semestres)`.
- Passing colors use `getPassingThreshold(item.Niveau ?? studentNiveau)`.
- Grade grid (CC/EX/TP/SO/RAT/MOY); stats modal (`ccStats`/`exStats`/`tpStats`/`moyStats`; `stats()` for modules).
- Module name mapping via `schoolAppClient.getModules(...)` (cached names); unresolved "Unknown" codes are tracked for re-fetch.

### Absences (`app/(tabs)/absences.tsx`)
- Two tabs (ABSENCES / SANCTIONS); `AbsenceItem`, `SanctionHeader`, `SanctionItem`; name mapping for elements.

### Calcules / Simulator (`app/(tabs)/calcules.tsx`)
- Selectors: niveau (1A–5A), semestre (S1/S2), filière; module accordion with CC/TP/EX inputs.
- Uses `computeSimulatorResult` (RATT-aware element averages; `coef_cc`/`coef_ex`/`coef_tp`/`coef_ecrit`/`coef_elem`).
- **Reset button** clears `userMarks` back to portal baseline (with confirmation).
- Marks persisted per-selection (`calc_storage_{niveau}_{filiere}_{semestre}`) + calculator snapshot cache.
- `getStatusColor` uses `getPassingThreshold(selNiveau)` (≥threshold green, ≥10 yellow, else red).
- Animated GPA footer (BlurView, `isDarkPalette` tint).

### Utils (`app/(tabs)/utils.tsx`)
- **Plan d'étude** (VH/Coef/Seuil/Eliminatoire), **Filières**, **État de la plateforme** (HEAD to SchoolApp, 15s refetch).

### Settings (`app/(tabs)/settings.tsx`)
- Appearance: theme picker (16 palettes + **Système**), font-size picker.
- Privacy: Student Card, biometric lock, grade privacy.
- **Haptics**: enable/disable, intensity (5 levels + test).
- Refresh: enabled toggle, interval input (1–360 min) with **smaller-interval warning**.
- **History**: interval picker (6/12/24/48/72h, default 72h) with smaller-interval warning.
- Notifications: master + per-type toggles. Logout, GitHub link, credits.

---

## 12. Configuration Files

### `app.json` (Expo)
- `version: 5.1.1`, `android.versionCode: 50101`, `newArchEnabled: true`, `userInterfaceStyle: automatic`, `orientation: portrait`, `experiments.typedRoutes: true`.
- iOS: `supportsTablet: false`, `UIBackgroundModes: [fetch]`, FaceID usage, `usesNonExemptEncryption: false`.
- Android permissions: `RECEIVE_BOOT_COMPLETED`, `SCHEDULE_EXACT_ALARM`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `WAKE_LOCK`.
- Plugins: `expo-router`, `expo-font`, `expo-web-browser`, `expo-background-fetch`, `expo-task-manager`, `expo-secure-store`, `expo-notifications`.
- `extra.router.origin = "https://kamal.aferiad.com/"`, `owner: kiimooo`, `extra.eas.projectId`.

### `eas.json`
- CLI `>= 16.28.0`, `appVersionSource: remote`.
- Profiles: `development` (dev client, internal, APK), `preview` (internal, APK), `production` (autoIncrement, AAB). Submit: production.

### `shell.nix`
- Nix dev shell: JDK17 + Android SDK (platforms 35/36, build-tools 35.0.0/36.0.0, NDK 27.1.12297006, CMake 3.22.1), no emulator/system images.

---

## 13. Key Implementation Notes / Gotchas

- **French localization** throughout UI (labels, notifications).
- **Grade parsing** handles French comma decimals (`"15,50"`); `"--"`/`"null"` treated as ungraded.
- **Passing threshold** is level-aware: 11/20 (1A–2A), 12/20 (3A–5A); a `"V"` verdict also counts as passing.
- **RATT** (rattrapage) uses the exact four-candidate `min(11, max(...))` formula; explicit `0` is a valid RATT, `null`/`"--"` is absent.
- **Privacy masking**: `isGradePrivacyEnabled` masks grade values with `••`.
- **Offline-first**: all data cached in AsyncStorage; screens read from cache, never network directly.
- **Deduplication**: change-detection + 10s in-memory notification dedup.
- **`JSESSIONID`** extracted from the cookie jar for direct authenticated image fetch (avatar/photo).
- **`getSemesterFromCode` / `getNiveauFromSemestre`** are intentionally left fragile (deferred item — not fixed).
- **`cleanData`** strips `client`/`_stats` keys to avoid circular JSON serialization.
- **LayoutAnimation** removed from Notes category switch to avoid Android native crashes.
- **BackHandler** manually handled in Notes/Utils for nested navigation + modals.

---

## 14. Build / Release Workflow

1. **Local dev:** `npm start`; lint `npm run lint`; tests `npm test`.
2. **Local signed build** (via `shell.nix` + Gradle):
   - `nix-shell --run 'cd android && ./gradlew :app:assembleRelease :app:bundleRelease'`
   - Release signing reads `android/app/keystore.properties` → `release.keystore` (alias `skewlapp`). Falls back to debug signing if absent.
3. **Cloud build:** `eas build -p android --profile production` (AAB, autoIncrement).
4. **GitHub release** (manual, after `release.yml` was removed): tag `vX.Y.Z`, push, then `gh release create vX.Y.Z SkewlApp-X.Y.Z.apk SkewlApp-X.Y.Z.aab --notes-file <notes>`.

**Release keystore** (`android/app/release.keystore`) is gitignored and NOT in the release — back it up separately.

---

## 15. Changelog Highlights

See `CHANGELOG.md` for full history. Summary:

### 5.1.1
- Removed Feddoul Salma from credits; fixed versionCode/versionName.

### 5.1.0
- **Added:** notification deep-linking, grade trend chart, simulator reset, follow-system theme, haptics, scheduled history refresh (72h).
- **Changed:** correct RATT formula, level-aware passing thresholds, identity-based absence detection, last-sync timestamp on every poll, smaller-interval warning.
- **Removed:** mock/dev environment, reverse goal-seek, unused deps.

### 5.0.6 and earlier
- Student card, privacy masking, biometric lock; grade-comma parsing; notification dedup; cookie fix.
