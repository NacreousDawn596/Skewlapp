/**
 * Centralized haptics utility.
 *
 * All tactile feedback is routed through this module so that the enabled flag
 * and intensity are respected globally without scattering settings checks
 * across every component.
 *
 * Intensity is mapped to genuinely distinct feedback on every platform:
 * - iOS uses the native impact styles (light/soft/medium/heavy/rigid).
 * - Android uses distinct vibration durations (the OS only exposes a single
 *   amplitude, so a longer pulse reads as a stronger impact).
 */
import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

export interface HapticsLevel {
  value: number;
  label: string;
}

/** Ordered intensity levels (0 = disabled, 5 = maximum). */
export const HAPTICS_LEVELS: HapticsLevel[] = [
  { value: 0, label: "Désactivé" },
  { value: 1, label: "Léger" },
  { value: 2, label: "Doux" },
  { value: 3, label: "Moyen" },
  { value: 4, label: "Fort" },
  { value: 5, label: "Maximum" },
];

export const DEFAULT_HAPTICS_ENABLED = true;
export const DEFAULT_HAPTICS_INTENSITY = 3;

/** Android vibration durations (ms), indexed by intensity level. */
const ANDROID_DURATIONS = [0, 20, 40, 65, 95, 140];

/** iOS impact styles, indexed by intensity level. */
const IOS_STYLES: Array<Haptics.ImpactFeedbackStyle | null> = [
  null,
  Haptics.ImpactFeedbackStyle.Light,
  Haptics.ImpactFeedbackStyle.Soft,
  Haptics.ImpactFeedbackStyle.Medium,
  Haptics.ImpactFeedbackStyle.Heavy,
  Haptics.ImpactFeedbackStyle.Rigid,
];

let hapticsEnabled = DEFAULT_HAPTICS_ENABLED;
let hapticsIntensity = DEFAULT_HAPTICS_INTENSITY;

/** Update global haptics configuration (called from settings loading). */
export function configureHaptics(enabled: boolean, intensity: number): void {
  hapticsEnabled = enabled === true;
  const rounded = Math.round(intensity);
  hapticsIntensity = Number.isFinite(rounded) ? Math.max(0, Math.min(5, rounded)) : 0;
}

export function getHapticsEnabled(): boolean {
  return hapticsEnabled;
}

export function getHapticsIntensity(): number {
  return hapticsIntensity;
}

function canVibrate(): boolean {
  return hapticsEnabled && hapticsIntensity > 0;
}

/** Generic impact feedback mapped to the configured intensity. */
export async function hapticImpact(): Promise<void> {
  if (!canVibrate()) return;
  try {
    if (Platform.OS === "android") {
      const duration = ANDROID_DURATIONS[hapticsIntensity];
      if (duration && duration > 0) {
        Vibration.vibrate(duration);
      }
    } else {
      const style = IOS_STYLES[hapticsIntensity];
      if (style) {
        await Haptics.impactAsync(style);
      }
    }
  } catch {
    // ignore — haptics are best-effort
  }
}

/** Light selection tick (used for pickers, chips, small changes). */
export async function hapticSelection(): Promise<void> {
  if (!canVibrate()) return;
  try {
    if (Platform.OS === "ios") {
      await Haptics.selectionAsync();
    } else {
      Vibration.vibrate(Math.min(15, ANDROID_DURATIONS[hapticsIntensity] ?? 15));
    }
  } catch {
    // ignore
  }
}

/** Success notification feedback. */
export async function hapticSuccess(): Promise<void> {
  if (!canVibrate()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}

/** Error notification feedback. */
export async function hapticError(): Promise<void> {
  if (!canVibrate()) return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {
    // ignore
  }
}

/** Immediate demonstration of the configured intensity (for the Test button). */
export async function hapticTest(): Promise<void> {
  await hapticImpact();
}
