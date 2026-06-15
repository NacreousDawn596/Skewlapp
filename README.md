# SkewlApp

SkewlApp is a professional, feature-rich mobile application designed for students to interact with the SchoolApp platform. It provides real-time access to grades, attendance, academic history, and a powerful grade simulator, all with robust offline support and background notifications.

## 🚀 Key Features

### 1. **Live Dashboard & Activity Feed**
- **Quick Stats:** Instant view of total absences, active sanctions, and school documents.
- **Activity Feed:** A reverse-chronological list of all recent updates (new grades, attendance changes, etc.).
- **Smart Avatar:** Automatically fetches and caches your official student photo.

### 2. **Comprehensive Notes & Grades**
- **Multi-Category Views:** Browse through current semester elements/modules or view your entire academic history.
- **Detailed Stats:** Click on any grade to view class statistics (Min, Max, Average, and your rank).
- **Initialization Detection:** Notifies you immediately when a grade is first assigned (null → value).

### 3. **Grade Simulator (Simulateur)**
- **Intelligent Prediction:** Estimate your semester and module averages before official results are out.
- **Baseline Sync:** Automatically imports your existing grades from the portal as a starting point.
- **Custom Overrides:** Manually enter potential marks for CC, TP, and EX to see how they impact your overall GPA.

### 4. **Absences & Sanctions**
- **Real-time Tracking:** Track every recorded absence with status (Justified/Unjustified).
- **Official Status:** View your current administrative standing and any official sanctions.

### 5. **Background Sync & Notifications**
- **Intelligent Polling:** Periodically checks for updates in the background (even when the app is closed).
- **Smart Deduplication:** Advanced logic ensures you never receive duplicate notifications for the same update.
- **Offline First:** All data is locally cached, providing a snappy experience even without an internet connection.

---

## 🛠 Developer & Testing Tools

### **Ultimate Realism Mock Server**
Located in `./mockServer`, this ExpressJS-based backend provides a 100% complete simulation of the SchoolApp platform.
- **HTML Table Generation:** Mimics the exact HTML structure of the school portal to test real parsing logic.
- **Session & CSRF Management:** Simulates cookie-based auth and security tokens.
- **State Persistence:** Local `db.json` stores all your test scenarios.

### **Hidden Developer Mode**
Reveal the hidden developer settings to switch between Production and Mock environments at runtime.
- **How to unlock:** Tap the **"Paramètres"** title in the settings tab **7 times**.
- **Features:** Instantly redirect app traffic to a local IP and clear cache for fresh testing.

---

## 📝 Recent Changelog (v5.1.0)

- **FIX:** Refactored grade detection to handle commas (e.g., `15,50`) correctly.
- **FIX:** Explicitly handles "Grade Initialization" (transition from no grade to a value).
- **FIX:** Implemented two-layer deduplication to prevent double notifications.
- **FIX:** Added `useEffect` sync hooks to ensure UI refreshes immediately after background polls.
- **NEW:** Added "Pull-to-Refresh" to the Grade Simulator.
- **NEW:** Integrated the **Ultimate Realism Mock Server** for sandbox testing.
- **NEW:** Added hidden **Developer Mode** with host-switching capabilities.
- **IMPROVED:** Localized all system notifications to French.

---

## 📦 Technical Stack
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Data:** React Query + Zustand
- **Parsing:** Cheerio (for HTML extraction)
- **API:** Custom `schoolapp` package

---

## 👨‍💻 Credits
Developed with passion (and lots of caffeine) by **Aferiad Kamal** & **Feddoul Salma**.
