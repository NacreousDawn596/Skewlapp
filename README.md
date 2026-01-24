<div align="center">
  <img src="https://github.com/afer-kamal/schoolapp_api/blob/main/assets/images/icon.png?raw=true" alt="SkewlApp Logo" width="120" />
  <h1>🎓 SkewlApp</h1>
  <p>
    <b>A sleek, fast, and reliable mobile app for ENSAM students to track their academic life in real-time.</b>
  </p>
  <p>
    <a href="https://github.com/afer-kamal/schoolapp_api/releases/latest"><img src="https://img.shields.io/github/v/release/afer-kamal/schoolapp_api?style=for-the-badge&logo=github&color=8A2BE2" alt="Latest Release" /></a>
    <a href="https://github.com/afer-kamal/schoolapp_api/blob/main/LICENSE"><img src="https://img.shields.io/github/license/afer-kamal/schoolapp_api?style=for-the-badge&color=blue" alt="License" /></a>
    <a href="https://github.com/afer-kamal/schoolapp_api/issues"><img src="https://img.shields.io/github/issues/afer-kamal/schoolapp_api?style=for-the-badge&logo=github&color=green" alt="Issues" /></a>
  </p>
</div>

---

**SkewlApp** is a feature-rich mobile application built with **React Native (Expo)** that empowers students at ENSAM to effortlessly monitor their academic progress. From notes and absences to module calculations, SkewlApp provides a modern, intuitive, and high-performance experience.

## 📜 Table of Contents
- [✨ Features](#-features)
- [🎨 Themes](#-themes)
- [🏗️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [📲 Build & Deployment](#-build--deployment)
- [🤝 Contributing](#-contributing)
- [🔒 Security Notes](#-security-notes)
- [🎯 Vision](#-vision)
- [📜 License](#-license)

---

## ✨ Features

### 🔐 Authentication
- **Secure Login:** robust authentication using student credentials.
- **Persistent Sessions:** Stay logged in with secure, session-based authentication (JSESSIONID).
- **Auto-Refresh:** Automatic session renewal ensures you're always connected.

### 🏠 Home
- **Student Dashboard:** A comprehensive overview of your academic profile.
- **Authenticated Data:** Securely fetches and displays your profile picture and academic information.

### 📘 Notes & Results
- **Structured Views:** Explore your academic results with organized sections for modules, elements, semesters, and years.
- **Real-Time Updates:** Data is automatically refreshed and cached for quick access.

### 🚫 Absences & Sanctions
- **Track Attendance:** View detailed records of absences and sanctions.
- **Instant Notifications:** Receive real-time alerts for new records.

### 🧮 Real-Time Grade Calculator
- **Interactive Calculator:** A powerful tool to calculate element, module, and overall averages.
- **Persistent & Editable:** Your calculations are saved locally and can be modified anytime.

### ⚙️ Settings
- **Customization:** Personalize your experience with over 15 premium themes, adjustable font sizes, and configurable polling intervals.
- **Account Management:** Easily log out and clear all cached data.

### 🔔 Real-Time Notifications
- **Stay Informed:** SkewlApp periodically checks for updates to your notes, absences, and sanctions, sending local notifications to keep you informed.

---

## 🎨 Themes

SkewlApp offers over **15 handcrafted themes**, allowing you to personalize your experience. Choose from deep dark modes, professional neutral palettes, and soft light themes.

---

## 🏗️ Tech Stack

- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Routing:** Expo Router
- **State Management:** React Context API & Hooks
- **API Client:** Axios
- **Storage:** Expo SecureStore
- **Notifications:** Expo Notifications

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
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS version recommended)
- Git
- Expo Go app on your [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) or [iOS](https://apps.apple.com/us/app/expo-go/id982107779) device.

### Installation
1. **Clone the repository:**
   ```bash
   git clone https://github.com/afer-kamal/schoolapp_api.git
   cd schoolapp_api
   ```
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Start the development server:**
   ```bash
   npx expo start
   ```
4. **Scan the QR code** with the Expo Go app to launch SkewlApp on your device.

> ⚠️ For full functionality, it is highly recommended to run the app on a physical **Android or iOS** device, not on a web browser.

---

## 📲 Build & Deployment

To create a standalone build of the app, you can use **Expo Application Services (EAS)**.

### Build for Android
```bash
# Build a production-ready APK/AAB
eas build -p android --profile production
```

### Build for iOS
```bash
# Build for iOS (requires a paid Apple Developer account)
eas build -p ios --profile production
```

For more details, refer to the [official EAS Build documentation](https://docs.expo.dev/build/introduction/).

---

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, improvements, or bug fixes, please follow these steps:

1. **Fork the repository.**
2. **Create a new branch:** `git checkout -b feature/your-feature-name`
3. **Make your changes** and commit them with a clear message.
4. **Push your branch** and open a **Pull Request**.

---

## 🔒 Security Notes

- All credentials and session data are stored securely on your device.
- Authenticated resources are fetched over HTTPS.
- User-entered calculator data remains local to the device.

---

## 🎯 Vision

SkewlApp aims to be a **trusted academic companion** that is fast, clean, and frustration-free—something students actually enjoy using.

*Built by students, for students.*

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](https://github.com/afer-kamal/schoolapp_api/blob/main/LICENSE) file for details.

---

<div align="center">
  <p>Made with ❤️, lack of sleep, and a lot of coffee by <a href="https://github.com/afer-kamal">Aferiad Kamal</a></p>
</div>