# 🎓 SkewlApp

**SkewlApp** is a schoolapp wrapper, a mobile application built with **React Native** that helps ENSAM students track their academic life in real time — notes, absences, modules, calculations, and more — all in one sleek, fast, and reliable app.

Designed to feel **modern, expensive, and effortless**, SkewlApp focuses on performance, clarity, and a smooth student experience.

---

## ✨ Features

### 🔐 Authentication
- Secure login using student credentials
- Session-based authentication (JSESSIONID)
- Persistent login with secure local storage
- Automatic logout on session expiration

---

### 🏠 Home
- Student profile overview
- Profile picture (authenticated fetch)
- Academic information loaded once per login
- Quick glance at important data

---

### 📘 Notes
Explore your academic results with structured views:
- **Elements en cours**
- **Modules en cours**
- **All Elements**
- **All Modules**
- **Semestres**
- **Annees**

Data is automatically refreshed and cached for fast access.

---

### 🚫 Absences
- View **Absences**
- View **Sanctions**
- Real-time updates when new records appear
- Clear and readable history

---

### 🧰 Utils
- **Modules**
- **Filieres**

These datasets are fetched once per login and cached permanently until logout.

---

### 🧮 Calcules (Real-Time Grade Calculator)
A powerful interactive calculator designed for students:

- Selector for **Niveau**, **Filiere**, and **Semestre**
- Defaults to the student’s current academic state
- Loads:
  - Current elements (live data)
  - Historical elements (older semesters)
- Editable inputs for:
  - CC
  - TP
  - EX (only if applicable)
- Real-time calculations:
  - Element average
  - Module average
  - **Moyenne Générale**
- All inputs are:
  - Cached locally
  - Persisted across app restarts
  - Editable later
- Smooth UI with collapsible modules and instant feedback

---

### ⚙️ Settings
- Logout (clears all cached data)
- Theme selector (15+ premium themes)
- Polling interval customization
- Font size adjustment
- Notification preferences
- check for updates

---

## 🔔 Real-Time Notifications
While logged in, SkewlApp periodically checks for updates:
- Notes
- Absences
- Sanctions
- Academic structure changes

When a change is detected, the app sends a **local notification** describing what changed.

Polling interval is configurable (default: 45 minutes).

---

## 🧠 Caching Strategy
- Profile data: cached per login
- Academic data: cached and refreshed periodically
- Calculator inputs: cached per (annee / semestre / filiere)
- Cache is cleared **only on logout**

This ensures:
- Fast performance
- Offline tolerance
- No accidental data loss

---

## 🎨 Themes
SkewlApp ships with **15+ handcrafted themes**, ranging from:
- Deep dark / AMOLED styles
- Neutral professional palettes
- Soft light themes

Theme changes apply instantly and persist across sessions.

---

## 🏗️ Tech Stack

- **React Native** (Expo)
- **TypeScript**
- **Expo Router**
- **Axios**
- **Local Secure Storage**
- **Context API / Hooks**
- **Local Notifications**

---

## 📁 Project Structure

```

src/
├── api/            # API client and helpers
├── app/            # Screens & routes (Expo Router)
├── assets/         # Images and icons
├── contexts/       # Auth & polling contexts
├── services/       # Notifications, polling logic
├── themes/         # Theme palettes & provider
├── types/          # TypeScript types
└── utils/          # Helpers & calculations

````

---

## 🚀 Getting Started

### Install dependencies
```bash
npm install
````

### Start the app

```bash
expo start
```

> ⚠️ For full functionality, run on **Android or iOS** (not web).

---

## 🔒 Security Notes

* Credentials and session data are never exposed publicly
* Authenticated resources are fetched securely
* User-entered calculator data stays local to the device

---

## 🎯 Vision

SkewlApp aims to be:

* A **trusted academic companion**
* Fast, clean, and frustration-free
* Something students actually enjoy opening

Built by students, for students.

---

## 📜 License - MIT license

This project is for educational and personal use.
All academic data belongs to its respective institution.

---

Made with lack of sleep, caffeine, and boredom by Aferiad Kamal
