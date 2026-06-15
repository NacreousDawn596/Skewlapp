import deepEqual from "deep-equal";
import { ActivityItem } from "../types/api";
import { PollEndpoint, PollSettings } from "./polling";

export const detectChanges = (
    endpoint: PollEndpoint,
    oldData: unknown,
    newData: unknown,
    settings: PollSettings
): ActivityItem[] => {
    // 🔥 OPTIMIZATION: Caller already check equality via stringify.
    // Full deepEqual on huge objects is too expensive on main thread.
    const activities: ActivityItem[] = [];

    const getVal = (item: any) => {
        const v = item.note ?? item.Moy ?? item.Note ?? item.Moyenne ?? item["Moy SEM"] ?? item["Moy Année"] ?? item["Moy Annee"];
        if (v === null || v === undefined || v === "" || v === "--" || v === "null") return null;
        
        const parsed = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v;
        if (typeof parsed === 'number' && !isNaN(parsed)) return parsed;
        
        return v;
    };

    if (endpoint === "currentElems" || endpoint === "allElems" || endpoint === "currentMods" || endpoint === "allMods") {
        if (Array.isArray(oldData) && Array.isArray(newData)) {
            // Optimize: Create a map for O(1) lookups
            const oldMap = new Map<string, any>();
            for (const item of oldData) {
                const key = item.CodeElem || item.CodeMod;
                if (key) oldMap.set(key, item);
            }

            for (const newItem of newData) {
                const itemKey = (newItem as any).CodeElem || (newItem as any).CodeMod;
                if (!itemKey) continue;

                const oldItem = oldMap.get(itemKey);

                const newVal = getVal(newItem);
                const oldVal = getVal(oldItem || {});

                const itemName = (newItem as any).Intitule || (newItem as any).Intitulé || (newItem as any).name || itemKey;
                const newStr = (newItem as any).note ?? (newItem as any).Moy ?? (newItem as any).Note ?? (newItem as any).Moyenne ?? (newItem as any)["Moy SEM"] ?? (newItem as any)["Moy Année"] ?? (newItem as any)["Moy Annee"] ?? "--";

                if (!oldItem) {
                    // NEW ITEM added to the list
                    const isGraded = newVal !== null;
                    activities.push({
                        id: "",
                        timestamp: 0,
                        type: "note",
                        title: isGraded ? `Note initialisée: ${itemName}` : `Nouvel élément: ${itemName}`,
                        description: isGraded ? `Note: ${newStr}` : "Élément ajouté au relevé",
                        route: "/notes",
                    });
                } else if (oldVal !== newVal) {
                    // EXISTING ITEM changed (including initialization: null -> value)
                    const oldStr = (oldItem as any).note ?? (oldItem as any).Moy ?? (oldItem as any).Note ?? (oldItem as any).Moyenne ?? (oldItem as any)["Moy SEM"] ?? (oldItem as any)["Moy Année"] ?? (oldItem as any)["Moy Annee"] ?? "--";
                    
                    const isInitialization = oldVal === null && newVal !== null;

                    activities.push({
                        id: "",
                        timestamp: 0,
                        type: "note",
                        title: isInitialization ? `Note initialisée: ${itemName}` : `Note mise à jour: ${itemName}`,
                        description: isInitialization ? `Note: ${newStr}` : `${oldStr} → ${newStr}`,
                        route: "/notes",
                    });
                }
            }
        }
    }

    if (endpoint === "absences") {
        const oldList = (oldData as any)?.details || (Array.isArray(oldData) ? oldData : []);
        const newList = (newData as any)?.details || (Array.isArray(newData) ? newData : []);

        if (Array.isArray(oldList) && Array.isArray(newList)) {
            if (newList.length > oldList.length) {
                const newAbsences = newList.slice(oldList.length);
                for (const absence of newAbsences) {
                    activities.push({
                        id: "",
                        timestamp: 0,
                        type: "absence",
                        title: "New Absence Recorded",
                        description: `${(absence as { module?: string; Element?: string }).module || (absence as { Element?: string }).Element || "Unknown module"} - ${(absence as { date?: string; Date?: string }).date || (absence as { Date?: string }).Date || ""}`,
                        route: "/absences",
                    });
                }
            }
        }
    }

    if (endpoint === "sanctions") {
        if (!deepEqual(oldData, newData)) {
            activities.push({
                id: "",
                timestamp: 0,
                type: "sanction",
                title: "Sanctions Updated",
                description: "Your sanctions status has changed",
                route: "/absences",
            });
        }
    }

    if (
        endpoint === "semestres" ||
        endpoint === "annees" ||
        endpoint === "currentMods" ||
        endpoint === "allMods"
    ) {
        activities.push({
            id: "",
            timestamp: 0,
            type: "update",
            title: "Data Updated",
            description: `${endpoint} information has been updated`,
            route: "/notes",
        });
    }

    return activities;
};
