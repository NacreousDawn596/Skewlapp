/**
 * Pure grade mathematics utilities.
 *
 * All simulator / grade calculations live here so they can be reused by the
 * simulator screen, the reverse goal-seek feature, and unit tests without
 * duplicating logic.
 *
 * No React / React Native imports — keep these functions pure and testable.
 */

/** Academic levels used across the application. */
export type Niveau = "1A" | "2A" | "3A" | "4A" | "5A";

/**
 * Convert a portal / user-provided grade into a finite number, or `null` when
 * the value is absent.
 *
 * Handles French decimal commas ("15,50"), the portal placeholder "--", empty
 * strings, and the string "null". An explicit zero is preserved as `0`.
 */
export function toGradeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const s = String(value).trim().replace(",", ".");
  if (s === "" || s === "--" || s.toLowerCase() === "null") return null;

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** True when the value is an explicitly recorded, finite grade (including 0). */
export function isRecordedGrade(value: unknown): value is number {
  const n = toGradeNumber(value);
  return n !== null;
}

/**
 * Academic passing threshold per level.
 *
 * 1A and 2A require 11/20, while 3A, 4A and 5A require 12/20.
 */
export function getPassingThreshold(niveau?: string | null): number {
  const n = (niveau ?? "").toString().trim().toUpperCase();
  if (n === "1A" || n === "2A") return 11;
  return 12;
}

/** True when a grade is equal to or above the passing threshold for a level. */
export function isPassingGrade(grade: unknown, niveau?: string | null): boolean {
  const n = toGradeNumber(grade);
  if (n === null) return false;
  return n >= getPassingThreshold(niveau);
}

export interface ElementCoefficients {
  /** Continuous-evaluation coefficient. */
  coefCc?: number;
  /** Exam coefficient. */
  coefEx?: number;
  /** Practical-work coefficient. */
  coefTp?: number;
  /** Written-part total coefficient (falls back to coefCc + coefEx). */
  coefEcrit?: number;
}

function safeCoef(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : 0;
  const n = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Weighted average over a list of (grade, coefficient) pairs. */
function weightedAverage(parts: Array<[number | null, number | undefined]>): number {
  let num = 0;
  let den = 0;
  for (const [note, coef] of parts) {
    const c = safeCoef(coef);
    if (c <= 0) continue;
    num += (note ?? 0) * c;
    den += c;
  }
  return den > 0 ? num / den : 0;
}

/**
 * Normal element average — N(CC, TP, EX).
 *
 * Written part (CC + EX) is sub-averaged by its own coefficients and then
 * weighted by `coefEcrit` (falling back to `coefCc + coefEx`), combined with TP.
 * This matches the existing simulator convention exactly.
 */
export function computeElementAverage(
  cc: number | null,
  ex: number | null,
  tp: number | null,
  c: ElementCoefficients
): number {
  const coefEcrit =
    safeCoef(c.coefEcrit) > 0 ? safeCoef(c.coefEcrit) : safeCoef(c.coefCc) + safeCoef(c.coefEx);

  const written = weightedAverage([
    [cc, c.coefCc],
    [ex, c.coefEx],
  ]);

  return weightedAverage([
    [written, coefEcrit],
    [tp, c.coefTp],
  ]);
}

/**
 * RATT (rattrapage) aware element average.
 *
 * When a valid RATT grade exists, evaluate the four candidate formulas and take
 * the best result capped at 11/20:
 *
 *   N_final = min(11, max( N(CC,TP,EX), N(CC,TP,RATT), N(RATT,TP), N(RATT) ))
 *
 * The rattrapage replaces the exam in the written part. When no RATT grade is
 * recorded, this falls back to the normal calculation with no 11-point cap.
 */
export function computeElementAverageWithRatt(
  cc: number | null,
  ex: number | null,
  tp: number | null,
  ratt: number | null,
  c: ElementCoefficients
): number {
  if (ratt === null || ratt === undefined || !Number.isFinite(ratt)) {
    return computeElementAverage(cc, ex, tp, c);
  }

  const coefEcrit =
    safeCoef(c.coefEcrit) > 0 ? safeCoef(c.coefEcrit) : safeCoef(c.coefCc) + safeCoef(c.coefEx);

  // Candidate 1: N(CC, TP, EX)
  const c1 = computeElementAverage(cc, ex, tp, c);

  // Candidate 2: N(CC, TP, RATT) — rattrapage replaces the exam
  const written2 = weightedAverage([
    [cc, c.coefCc],
    [ratt, c.coefEx],
  ]);
  const c2 = weightedAverage([
    [written2, coefEcrit],
    [tp, c.coefTp],
  ]);

  // Candidate 3: N(RATT, TP) — only rattrapage and practical work
  const c3 = weightedAverage([
    [ratt, coefEcrit],
    [tp, c.coefTp],
  ]);

  // Candidate 4: N(RATT) — rattrapage alone
  const c4 = ratt;

  return Math.min(11, Math.max(c1, c2, c3, c4));
}

/** Module average — weighted average of element averages by `coefElem`. */
export function computeModuleAverage(
  elements: Array<{ average: number; coefElem?: number }>
): number {
  return weightedAverage(elements.map((e) => [e.average, e.coefElem ?? 1]));
}

/** Global average — weighted average of module averages by module coefficient. */
export function computeGlobalAverage(
  modules: Array<{ average: number; coef?: number }>
): number {
  return weightedAverage(modules.map((m) => [m.average, m.coef ?? 1]));
}

/* -------------------------------------------------------------------------- */
/*                            Simulator resolution                            */
/* -------------------------------------------------------------------------- */

/** A raw baseline result from the portal (element notes). */
export interface BaselineResult {
  CC?: unknown;
  EX?: unknown;
  TP?: unknown;
  /** Portal rattrapage grade (field may be "RAT" or "RATT"). */
  RAT?: unknown;
  RATT?: unknown;
  Moy?: unknown;
  [key: string]: unknown;
}

/** User overrides for an element's marks. */
export interface UserMarks {
  [elemCode: string]: { CC?: string; TP?: string; EX?: string } | undefined;
}

/** A module record as returned by the SchoolApp `getModules` parser. */
export interface ModuleLookup {
  [modCode: string]: {
    intitule?: string;
    coef?: number;
    elements?: Array<{
      code?: string;
      intitule?: string;
      coef_cc?: number;
      coef_ex?: number;
      coef_ecrit?: number;
      coef_tp?: number;
      coef_elem?: number;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
}

export interface SimulatorElement {
  code: string;
  intitule?: string;
  coef_elem: number;
  coef_cc: number;
  coef_ex: number;
  coef_tp: number;
  coef_ecrit: number;
  /** Raw resolved values for the UI inputs (may be strings). */
  cc: unknown;
  tp: unknown;
  ex: unknown;
  /** Computed element average. */
  average: number;
  /** Original portal baseline for this element. */
  baseline: BaselineResult | null;
}

export interface SimulatorModule {
  code: string;
  intitule?: string;
  coef: number;
  average: number;
  elements: SimulatorElement[];
}

export interface SimulatorResult {
  modules: SimulatorModule[];
  globalAvg: number;
}

/**
 * Compute the full simulator result (module + global averages) from the module
 * lookup, portal baseline results, and user overrides.
 *
 * @param modulesLookup modules returned by `getModules` (keyed by module code).
 * @param resultsMap map of element code → portal baseline result.
 * @param userMarks user overrides keyed by element code.
 */
export function computeSimulatorResult(
  modulesLookup: ModuleLookup,
  resultsMap: Map<string, BaselineResult>,
  userMarks: UserMarks
): SimulatorResult {
  const modules: SimulatorModule[] = [];

  for (const [modCode, mData] of Object.entries(modulesLookup ?? {})) {
    if (!mData || typeof mData !== "object") continue;

    const elements: SimulatorElement[] = [];
    let modSum = 0;
    let modCoefSum = 0;

    for (const elem of mData.elements ?? []) {
      if (!elem || typeof elem !== "object") continue;
      const code = String(elem.code ?? "");
      const baseline = resultsMap.get(code) ?? null;
      const u = userMarks[code] ?? {};

      const coefCc = safeCoef(elem.coef_cc);
      const coefEx = safeCoef(elem.coef_ex);
      const coefTp = safeCoef(elem.coef_tp);
      const coefEcrit = safeCoef(elem.coef_ecrit);
      const coefElem = safeCoef(elem.coef_elem) || 1;

      const rawCc = u.CC !== undefined ? u.CC : baseline?.CC ?? "";
      const rawTp = u.TP !== undefined ? u.TP : baseline?.TP ?? "";
      const rawEx = u.EX !== undefined ? u.EX : baseline?.EX ?? "";

      const cc = toGradeNumber(rawCc);
      const tp = toGradeNumber(rawTp);
      const ex = toGradeNumber(rawEx);

      const ratt = toGradeNumber(baseline?.RAT ?? baseline?.RATT);

      const average = computeElementAverageWithRatt(cc, ex, tp, ratt, {
        coefCc,
        coefEx,
        coefTp,
        coefEcrit,
      });

      elements.push({
        code,
        intitule: elem.intitule,
        coef_elem: coefElem,
        coef_cc: coefCc,
        coef_ex: coefEx,
        coef_tp: coefTp,
        coef_ecrit: coefEcrit,
        cc: rawCc,
        tp: rawTp,
        ex: rawEx,
        average,
        baseline,
      });

      modSum += average * coefElem;
      modCoefSum += coefElem;
    }

    const coef = safeCoef(mData.coef) || 1;
    const average = modCoefSum > 0 ? modSum / modCoefSum : 0;

    modules.push({
      code: modCode,
      intitule: mData.intitule,
      coef,
      average,
      elements,
    });
  }

  const globalAvg = computeGlobalAverage(modules);
  return { modules, globalAvg };
}

/* -------------------------------------------------------------------------- */
/*                              Trend data shaping                             */
/* -------------------------------------------------------------------------- */

export interface TrendPoint {
  /** Semester label (e.g. "S1", "S3"). */
  label: string;
  /** Academic year (e.g. "2024/2025"). */
  au: string;
  /** Average for the semester, or null when unavailable. */
  value: number | null;
}

/** Extract a semester average from a semester result record (multiple field spellings). */
export function semesterValue(item: unknown): number | null {
  if (!item || typeof item !== "object") return null;
  const r = item as Record<string, unknown>;
  const v =
    r["Moy SEM"] ??
    r["Moy_SEM"] ??
    r.MoySEM ??
    r.Moy_sem ??
    r.Moy ??
    r.Moyenne ??
    r["Moy Année"] ??
    r["Moy Annee"];
  return toGradeNumber(v);
}

/** Build a chronologically ordered list of semester averages from portal data. */
export function buildSemesterTrend(semestres: unknown): TrendPoint[] {
  const points: TrendPoint[] = [];
  if (Array.isArray(semestres)) {
    for (const s of semestres) {
      if (!s || typeof s !== "object") continue;
      const r = s as Record<string, unknown>;
      const label = String(r.Semestre ?? r.Niveau ?? "").trim();
      if (!label) continue;
      const au = String(r.AU ?? r.au ?? "").trim();
      points.push({ label, au, value: semesterValue(s) });
    }
  }

  points.sort((a, b) => {
    if (a.au !== b.au) return a.au.localeCompare(b.au);
    const an = parseInt(a.label.replace(/[^0-9]/g, "") || "0", 10);
    const bn = parseInt(b.label.replace(/[^0-9]/g, "") || "0", 10);
    return an - bn;
  });

  return points;
}
