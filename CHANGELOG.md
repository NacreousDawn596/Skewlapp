# Changelog

All notable changes to SkewlApp are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.1.0] - 2026-11-05

### Added
- **Notification deep-linking** — tapping a grade, absence, or sanction notification opens the relevant screen (works from foreground, background, and cold-start).
- **Grade trend chart** — visualizes semester averages directly in the Notes screen.
- **Grade simulator reset** — restore the portal's original grades with one tap.
- **"Follow system" theme** — the app can now follow the device's light/dark appearance.
- **Haptic feedback** — configurable enable/disable, intensity, and test feedback.
- **Scheduled academic-history refresh** — refreshes past results on an independent schedule (configurable, default **72 hours**) with notifications for newly published results.

### Changed
- Simulator now uses the correct ENSAM **RATT (rattrapage)** four-candidate formula, capped at 11/20.
- Passing thresholds now follow the academic level: **11/20 for 1A–2A**, **12/20 for 3A–5A**.
- Absence change detection now compares records by identity (detects justification changes without false positives from reordering).
- Last-sync timestamp now updates after every successful synchronization.
- Changing an interval to a smaller value now shows a warning before applying.

### Fixed
- RATT field mismatch (`RAT` vs `RATT`) in the simulator.
- Silent polling no longer leaves a stale "last updated" timestamp.
- Existing absence changes (e.g. `NON JUSTIFIÉE` → `JUSTIFIÉE`) now generate notifications.

### Removed
- Mock/developer environment and the hidden developer mode.
- Reverse goal-seek ("Objectif de moyenne").
- Unused dependencies (`expo-image-picker`, `expo-symbols`, `@expo/vector-icons`, `zustand`).

## [5.0.6] - 2026-10-19

### Added
- Virtual student ID card.
- Grade privacy masking and biometric lock.
- Mock server for development testing.

### Fixed
- Accumulated-cookies issue in the `schoolapp` package.
- Grade detection with comma decimals and grade initialization.
- Duplicate notification prevention.

---

**Author:** Aferiad Kamal — kamal@aferiad.com
