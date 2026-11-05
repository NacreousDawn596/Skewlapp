<div align="center">
  <img src="assets/images/icon.png" alt="SkewlApp logo" width="140" />

  # SkewlApp

  **Your ENSAM-UMI academic life, beautifully organized.**

  Real-time grades, attendance, sanctions, a grade simulator, and a virtual student card — all with offline-first caching and background notifications.

  <img src="https://img.shields.io/github/v/release/NacreousDawn596/SkewlApp?label=version&color=8AB4FF&style=flat-square" alt="release" />
  <img src="https://img.shields.io/github/license/NacreousDawn596/SkewlApp?color=6BCB77&style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/react--native-0.81.5-61DAFB?style=flat-square&logo=react" alt="react native" />
  <img src="https://img.shields.io/badge/expo-SDK%2054-000020?style=flat-square&logo=expo" alt="expo" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178C6?style=flat-square&logo=typescript" alt="typescript" />
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-999999?style=flat-square" alt="platform" />
  <img src="https://img.shields.io/badge/status-active-FFD93D?style=flat-square" alt="status" />
</div>

---

## ✨ Overview

**SkewlApp** is a professional mobile application for students of **ENSAM-UMI** (École Nationale Supérieure d'Arts et Métiers, Université Mohammed V) to interact with the official **SchoolApp** portal. It wraps the school's HTML portal into a fast, native, offline-first experience — with smart background sync, real-time notifications, and a powerful grade simulator.

> ⚡ **Why SkewlApp?** The official portal is web-only and clunky on mobile. SkewlApp gives you instant access, cached data when you're offline, and a push notification the moment a new grade or absence appears.

---

## 📱 Features

| | Feature | Description |
|---|---------|-------------|
| 🏠 | **Live Dashboard** | Quick stats (absences, sanctions, documents) + a reverse-chronological activity feed of every recent update. |
| 🎓 | **Grades & Notes** | Browse current elements/modules or your full academic history; tap a grade for class statistics (min / max / average / rank). |
| 🧮 | **Grade Simulator** | Predict your module & global average by overriding CC / TP / EX marks — with a one-tap reset to the portal baseline. |
| 📉 | **Grade Trend Chart** | Visualize your semester-average evolution over time with a clean SVG chart. |
| 🚫 | **Absences & Sanctions** | Track every absence (justified / unjustified) and your official administrative standing. |
| 🔔 | **Smart Notifications** | Background polling with deduplication — get notified the moment a grade changes or an absence is recorded. Tapping a notification deep-links to the right screen. |
| 🔒 | **Biometric Lock** | Protect the app with Face ID / fingerprint, with a privacy mode that masks grades. |
| 🪪 | **Virtual Student Card** | Your digital ENSAM ID with a scannable QR code. |
| 🎨 | **Themes** | 16 hand-crafted palettes + a "follow system" dark/light mode, plus a font-size scale. |
| 📳 | **Haptics** | Configurable tactile feedback (intensity levels) for a native feel. |

---

## 🛠 Tech Stack

<div align="center">
  <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="react native" />
  <img src="https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white" alt="expo" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="typescript" />
  <img src="https://img.shields.io/badge/React_Query-5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white" alt="react query" />
  <img src="https://img.shields.io/badge/Cheerio-HTML_parsing-CC3534?style=for-the-badge" alt="cheerio" />
  <img src="https://img.shields.io/badge/Vitest-tests-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="vitest" />
</div>

- **Framework:** React Native `0.81.5` (New Architecture) on **Expo SDK 54**
- **Language:** TypeScript (strict)
- **State:** React Query + lightweight context hooks
- **Storage:** AsyncStorage (cache) + `expo-secure-store` (credentials)
- **API:** custom [`schoolapp`](https://github.com/NacreousDawn596/schoolapp.js) package (cookie auth + HTML scraping via Cheerio)
- **UI:** `lucide-react-native` icons, `react-native-svg`, `expo-linear-gradient`, `expo-blur`, `expo-haptics`

---

## 📥 Download

Grab the latest signed build from the [**Releases**](https://github.com/NacreousDawn596/SkewlApp/releases) page:

| Artifact | Purpose |
|----------|---------|
| `SkewlApp-5.1.1.apk` | Universal APK (all ABIs) — sideload directly |
| `SkewlApp-5.1.1.aab` | Android App Bundle — for Play Store |

> ℹ️ Sideloading will show Android's standard *"install unknown app"* prompt (normal for any non-Play-Store app). Verify the SHA-256 checksum in the release notes if you hit issues.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org) ≥ 20
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- For Android native builds: JDK 17 + Android SDK (see [`shell.nix`](shell.nix) for a ready-made Nix environment)

### Install & run

```bash
# 1. Clone
git clone https://github.com/NacreousDawn596/SkewlApp.git
cd SkewlApp

# 2. Install dependencies
npm install

# 3. Start the dev server
npm start            # Expo (Metro)
npm run android      # Android (requires native toolchain)
npm run ios          # iOS (macOS only)
npm run start-web    # Web
```

### Useful commands

```bash
npm test   # run Vitest unit tests
npm run lint   # ESLint
```

---

## 📦 Building

### Local signed Android build

```bash
# 1. Generate the native project (first time only)
npx expo prebuild --platform android

# 2. Place your release keystore at android/app/release.keystore
#    and its credentials in android/app/keystore.properties:
#      storeFile=release.keystore
#      storePassword=...
#      keyAlias=skewlapp
#      keyPassword=...

# 3. Build APK + AAB (via the Nix shell, or any JDK17 + Android SDK)
nix-shell --run 'cd android && ./gradlew :app:assembleRelease :app:bundleRelease'
```

Outputs:
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

### Cloud build (EAS)

```bash
npx eas login
npx eas init                     # first time only
npx eas build -p android --profile production   # AAB for Play Store
```

---

## 🧪 Tests

Pure math and detection logic are unit-tested with **Vitest** (`npm test`):

- RATT (rattrapage) four-candidate formula & caps
- Passing thresholds per level (11/20 for 1A–2A, 12/20 for 3A–5A)
- Absence change detection (identity-based)
- Notification deep-link route validation
- Trend-chart data shaping

---

## 📁 Project Structure

```
├── app/          # expo-router screens (tabs: home, notes, absences, utils, calcules, settings)
├── components/   # reusable UI (GradeTrendChart, StudentCardModal)
├── contexts/     # AuthContext, PollingContext
├── services/     # polling, cache, grades math, haptics, notifications, change detection
├── themes/       # palette system + ThemeContext
├── types/        # domain types + schoolapp package declaration
└── tests/        # Vitest unit tests
```

See [`PROJECT.md`](PROJECT.md) for a full technical reference.

---

## 📝 Changelog

See [**CHANGELOG.md**](CHANGELOG.md) for the complete release history.

### Latest — v5.1.1
- Removed Feddoul Salma from credits
- Fixed `versionCode` / `versionName` in the Android build

---

## 👤 Author

**Aferiad Kamal** — [kamal@aferiad.com](mailto:kamal@aferiad.com)

Made with ❤️, lots of coffee, and far too little sleep.

---

## 📄 License

[MIT](LICENSE) © 2026 Aferiad Kamal
