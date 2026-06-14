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
        const v = item.note ?? item.Moy ?? item.Note ?? item.Moyenne ?? item["Moy SEM"] ?? item["Moy Annee"];
        if (v === null || v === undefined || v === "" || v === "--") return null;
        return typeof v === 'string' ? parseFloat(v) : v;
    };

    if (endpoint === "currentElems" || endpoint === "allElems" || endpoint === "currentMods" || endpoint === "allMods") {
        if (Array.isArray(oldData) && Array.isArray(newData)) {
            if (newData.length > oldData.length) {
                activities.push({
                    id: "",
                    timestamp: 0,
                    type: "note",
                    title: endpoint.includes("Elem") ? "New Element Added" : "New Module Added",
                    description: `${newData.length - oldData.length} new items detected`,
                    route: "/notes",
                });
            }

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

                const oldVal = getVal(oldItem || {});
                const newVal = getVal(newItem);

                if (oldItem && oldVal !== newVal) {
                    const itemName = (newItem as any).Intitule || itemKey;

                    activities.push({
                        id: "",
                        timestamp: 0,
                        type: "note",
                        title: `Grade Updated: ${itemName}`,
                        description: `${oldVal ?? "N/A"} → ${newVal ?? "N/A"}`,
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
