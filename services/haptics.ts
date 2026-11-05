/**
 * Centralized haptics utility.
 *
 * All tactile feedback is routed through this module so that the enabled flag
 * and intensity are respected globally without scattering settings checks
 * across every component.
 */
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export interface HapticsLevel {
  value: number;
  label: string;
  style: Haptics.ImpactFeedbackStyle | null;
}

/** Ordered intensity levels (0 = disabled, 5 = maximum). */
export const HAPTICS_LEVELS: HapticsLevel[] = [
  { value: 0, label: "Désactivé", style: null },
  { value: 1, label: "Léger", style: Haptics.ImpactFeedbackStyle.Light },
  { value: 2, label: "Doux", style: Haptics.ImpactFeedbackStyle.Soft },
  { value: 3, label: "Moyen", style: Haptics.ImpactFeedbackStyle.Medium },
  { value: 4, label: "Fort", style: Haptics.ImpactFeedbackStyle.Heavy },
  { value: 5, label: "Maximum", style: Haptics.ImpactFeedbackStyle.Rigid },
];

export const DEFAULT_HAPTICS_ENABLED = true;
export const DEFAULT_HAPTICS_INTENSITY = 3;

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

function impactStyle(): Haptics.ImpactFeedbackStyle | null {
  const level = HAPTICS_LEVELS[hapticsIntensity];
  return level?.style ?? null;
}

/** Generic impact feedback mapped to the configured intensity. */
export async function hapticImpact(): Promise<void> {
  if (!canVibrate()) return;
  const style = impactStyle();
  if (!style) return;
  try {
    await Haptics.impactAsync(style);
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
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  if (!hapticsEnabled || hapticsIntensity <= 0) return;
  await hapticImpact();
}
