import deepEqual from "deep-equal";
import type { ActivityItem } from "../types/api";
import type { PollEndpoint, PollSettings } from "./polling";

/* -------------------------------------------------------------------------- */
/*                              Grade extraction                              */
/* -------------------------------------------------------------------------- */

function getVal(item: any): number | string | null {
  const v =
    item.note ??
    item.Moy ??
    item.Note ??
    item.Moyenne ??
    item["Moy SEM"] ??
    item["Moy Année"] ??
    item["Moy Annee"];
  if (v === null || v === undefined || v === "" || v === "--" || v === "null") return null;

  const parsed = typeof v === "string" ? parseFloat(v.replace(",", ".")) : v;
  if (typeof parsed === "number" && !isNaN(parsed)) return parsed;

  return v;
}

function getGradeStr(item: any): string {
  const raw =
    item.note ??
    item.Moy ??
    item.Note ??
    item.Moyenne ??
    item["Moy SEM"] ??
    item["Moy Année"] ??
    item["Moy Annee"] ??
    "--";
  return raw === null || raw === undefined ? "--" : String(raw);
}

function itemName(item: any): string {
  return (
    item.Intitule ||
    item.Intitulé ||
    item.intitule ||
    item.name ||
    item.Name ||
    item.Libelle ||
    item.Libellé ||
    item.Module ||
    item.Element ||
    ""
  );
}

/* -------------------------------------------------------------------------- */
/*                             Grade change detection                          */
/* -------------------------------------------------------------------------- */

/** Detect note changes for element/module note lists (identity = CodeElem/CodeMod). */
function detectGradeChanges(oldData: unknown, newData: unknown): ActivityItem[] {
  const activities: ActivityItem[] = [];
  if (!Array.isArray(oldData) || !Array.isArray(newData)) return activities;

  const oldMap = new Map<string, any>();
  for (const item of oldData) {
    const key = item?.CodeElem || item?.CodeMod;
    if (key) oldMap.set(key, item);
  }

  for (const newItem of newData) {
    const itemKey = newItem?.CodeElem || newItem?.CodeMod;
    if (!itemKey) continue;

    const oldItem = oldMap.get(itemKey);
    const newVal = getVal(newItem);
    const oldVal = getVal(oldItem ?? {});
    const name = itemName(newItem) || itemKey;
    const newStr = getGradeStr(newItem);

    if (!oldItem) {
      const isGraded = newVal !== null;
      activities.push({
        id: "",
        timestamp: 0,
        type: "note",
        title: isGraded ? `Note initialisée: ${name}` : `Nouvel élément: ${name}`,
        description: isGraded ? `Note: ${newStr}` : "Élément ajouté au relevé",
        route: "/notes",
      });
    } else if (oldVal !== newVal) {
      const oldStr = getGradeStr(oldItem);
      const isInitialization = oldVal === null && newVal !== null;
      activities.push({
        id: "",
        timestamp: 0,
        type: "note",
        title: isInitialization ? `Note initialisée: ${name}` : `Note mise à jour: ${name}`,
        description: isInitialization ? `Note: ${newStr}` : `${oldStr} → ${newStr}`,
        route: "/notes",
      });
    }
  }

  return activities;
}

/* -------------------------------------------------------------------------- */
/*                             Absence detection                               */
/* -------------------------------------------------------------------------- */

/** Stable identity for an absence record (element + date + session). */
export function absenceIdentity(item: any): string | null {
  if (!item || typeof item !== "object") return null;
  const element = String(item.Element ?? item.Module ?? item.element ?? "").trim();
  const date = String(item.Date ?? item.date ?? "").trim();
  const seance = String(item.Seance ?? item.Seance ?? "").trim();
  const parts = [element, date, seance].filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  return parts.join("|");
}

/** Normalized justification status of an absence record. */
export function absenceStatus(item: any): "justified" | "unjustified" | "unknown" {
  const justif = item?.Justif;
  const justifiee = item?.Justifiee;
  const justifieeStr = String(justifiee ?? "").trim().toLowerCase();
  if (justif === true || justif === "true" || justifieeStr === "oui" || justifieeStr === "true") {
    return "justified";
  }
  if (justif === false || justif === "false" || justifieeStr === "non" || justifieeStr === "false") {
    return "unjustified";
  }
  return "unknown";
}

/** Comparable signature of an absence's relevant fields. */
export function absenceSignature(item: any): string {
  const status = absenceStatus(item);
  const remarques = String(item?.Remarques ?? item?.Remarque ?? "").trim();
  const date = String(item?.Date ?? item?.date ?? "").trim();
  const element = String(item?.Element ?? item?.Module ?? item?.element ?? "").trim();
  const seance = String(item?.Seance ?? item?.Seance ?? "").trim();
  return JSON.stringify({ status, remarques, date, element, seance });
}

function absenceList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as any).details)) {
    return (data as any).details;
  }
  return [];
}

/** Identity-based absence change detection (handles new, changed, and reordered). */
export function detectAbsenceChanges(oldData: unknown, newData: unknown): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const oldList = absenceList(oldData);
  const newList = absenceList(newData);
  if (oldList.length === 0 || newList.length === 0) return activities;

  const oldMap = new Map<string, any>();
  for (const item of oldList) {
    const id = absenceIdentity(item);
    if (id) oldMap.set(id, item);
  }

  const seen = new Set<string>();
  for (const newItem of newList) {
    const id = absenceIdentity(newItem);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const element = itemName(newItem) || newItem.Element || "Module";
    const date = newItem.Date || newItem.date || "";

    if (!oldMap.has(id)) {
      activities.push({
        id: "",
        timestamp: 0,
        type: "absence",
        title: "Nouvelle absence",
        description: `${element}${date ? ` - ${date}` : ""}`,
        route: "/absences",
      });
      continue;
    }

    const oldItem = oldMap.get(id);
    if (absenceSignature(oldItem) !== absenceSignature(newItem)) {
      const newStatus = absenceStatus(newItem);
      const oldStatus = absenceStatus(oldItem);
      const label =
        newStatus === "justified" ? "justifiée" : newStatus === "unjustified" ? "non justifiée" : "mise à jour";
      activities.push({
        id: "",
        timestamp: 0,
        type: "absence",
        title:
          newStatus !== oldStatus ? `Absence ${label}` : "Absence mise à jour",
        description: `${element}${date ? ` - ${date}` : ""}`,
        route: "/absences",
      });
    }
  }

  return activities;
}

/* -------------------------------------------------------------------------- */
/*                          Semester / year detection                          */
/* -------------------------------------------------------------------------- */

function summaryList(data: unknown): any[] {
  if (Array.isArray(data)) return data;
  return [];
}

function summaryIdentity(item: any): string | null {
  if (!item || typeof item !== "object") return null;
  const label = String(item.Semestre ?? item.Niveau ?? "").trim();
  const au = String(item.AU ?? item.au ?? "").trim();
  if (!label) return null;
  return `${label}|${au}`;
}

/** Detect newly published or changed semester/year results. */
export function detectSummaryChanges(oldData: unknown, newData: unknown): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const oldList = summaryList(oldData);
  const newList = summaryList(newData);
  if (oldList.length === 0) return activities;

  const oldMap = new Map<string, any>();
  for (const item of oldList) {
    const id = summaryIdentity(item);
    if (id) oldMap.set(id, item);
  }

  for (const newItem of newList) {
    const id = summaryIdentity(newItem);
    if (!id) continue;
    const label = newItem.Semestre || newItem.Niveau || id;
    const newVal = getVal(newItem);

    if (!oldMap.has(id)) {
      activities.push({
        id: "",
        timestamp: 0,
        type: "note",
        title: `Nouveau résultat: ${label}`,
        description: newVal !== null ? `Moyenne: ${newVal}` : "Résultat publié",
        route: "/notes",
      });
      continue;
    }

    const oldItem = oldMap.get(id);
    const oldVal = getVal(oldItem);
    if (oldVal !== newVal) {
      activities.push({
        id: "",
        timestamp: 0,
        type: "note",
        title: `Résultat mis à jour: ${label}`,
        description: `${getGradeStr(oldItem)} → ${getGradeStr(newItem)}`,
        route: "/notes",
      });
    }
  }

  return activities;
}

/* -------------------------------------------------------------------------- */
/*                                  Main entry                                 */
/* -------------------------------------------------------------------------- */

export const detectChanges = (
  endpoint: PollEndpoint,
  oldData: unknown,
  newData: unknown,
  _settings: PollSettings
): ActivityItem[] => {
  switch (endpoint) {
    case "currentElems":
    case "allElems":
    case "currentMods":
    case "allMods":
      return detectGradeChanges(oldData, newData);
    case "absences":
      return detectAbsenceChanges(oldData, newData);
    case "sanctions":
      if (!deepEqual(oldData, newData)) {
        return [
          {
            id: "",
            timestamp: 0,
            type: "sanction",
            title: "Sanctions mises à jour",
            description: "Votre statut disciplinaire a changé",
            route: "/absences",
          },
        ];
      }
      return [];
    case "semestres":
    case "annees":
      return detectSummaryChanges(oldData, newData);
    default:
      return [];
  }
};
