import AsyncStorage from "@react-native-async-storage/async-storage";
import { PollEndpoint } from "./polling";

const CACHE_PREFIX = "skewl_cache_";
const MODULES_CACHE_PREFIX = "skewl_modules_";
const NAMES_CACHE_KEY = "skewl_element_names_forever";
const CALCULATOR_STATE_KEY = "skewl_calculator_state";
export const ACTIVITY_KEY = "skewl_activity";

interface CalculatorSelectionCache {
  modulesLookup?: unknown;
  currentElems?: unknown;
  historyElems?: unknown;
  userMarks?: Record<string, { CC?: string; TP?: string; EX?: string }>;
  elementNames?: Record<string, string>;
  updatedAt?: number;
}

interface CalculatorCacheState {
  version: number;
  updatedAt: number;
  filieres?: unknown;
  modulesLookup?: unknown;
  currentElems?: unknown;
  historyElems?: unknown;
  elementNames?: Record<string, string>;
  selections: Record<string, CalculatorSelectionCache>;
}

export const getCacheKey = (endpoint: PollEndpoint): string => {
  return `${CACHE_PREFIX}${endpoint}`;
};

export const getModulesCacheKey = (niveau: string, filiere: string, semestre: string): string => {
  return `${MODULES_CACHE_PREFIX}${niveau}_${filiere}_${semestre}`;
};

export const getCachedData = async (endpoint: PollEndpoint): Promise<unknown> => {
  try {
    const cached = await AsyncStorage.getItem(getCacheKey(endpoint));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Failed to get cached data for ${endpoint}:`, error);
    return null;
  }
};

export const getCachedModules = async (niveau: string, filiere: string, semestre: string): Promise<unknown> => {
  try {
    const cached = await AsyncStorage.getItem(getModulesCacheKey(niveau, filiere, semestre));
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.error(`Failed to get cached modules:`, error);
    return null;
  }
};

export const setCachedModules = async (niveau: string, filiere: string, semestre: string, data: unknown): Promise<void> => {
  try {
    const cleaned = cleanData(data);
    await AsyncStorage.setItem(getModulesCacheKey(niveau, filiere, semestre), JSON.stringify(cleaned));
    console.log(`[Cache] Cached modules for ${niveau} ${filiere} ${semestre}`);
  } catch (error) {
    console.error(`Failed to cache modules:`, error);
  }
};

export const getCachedElementNames = async (): Promise<Record<string, string>> => {
  try {
    const cached = await AsyncStorage.getItem(NAMES_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch (error) {
    console.error(`Failed to get element names cache:`, error);
    return {};
  }
};

export const setCachedElementNames = async (names: Record<string, string>): Promise<void> => {
  try {
    await AsyncStorage.setItem(NAMES_CACHE_KEY, JSON.stringify(names));
    console.log(`[Cache] Cached ${Object.keys(names).length} element names permanently`);
  } catch (error) {
    console.error(`Failed to cache element names:`, error);
  }
};

export const cleanData = (data: any): any => {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(cleanData);
    if (typeof data === "object") {
        const cleaned: any = {};
        for (const key in data) {
            if (key === "client" || key === "_stats") continue;
            cleaned[key] = cleanData(data[key]);
        }
        return cleaned;
    }
    return data;
};

export const setCachedData = async (endpoint: PollEndpoint, data: unknown): Promise<void> => {
    try {
        const cleaned = cleanData(data);
        await AsyncStorage.setItem(getCacheKey(endpoint), JSON.stringify(cleaned));
    } catch (error) {
        console.error(`Failed to cache data for ${endpoint}:`, error);
    }
};

const getCalculatorSelectionKey = (niveau: string, filiere: string, semestre: string): string => {
  return `${niveau}_${filiere}_${semestre}`;
};

export const getCalculatorCacheState = async (): Promise<CalculatorCacheState | null> => {
  try {
    const stored = await AsyncStorage.getItem(CALCULATOR_STATE_KEY);
    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as CalculatorCacheState;
  } catch (error) {
    console.error("Failed to load calculator cache:", error);
    return null;
  }
};

export const getCalculatorSelectionCache = async (
  niveau: string,
  filiere: string,
  semestre: string
): Promise<CalculatorSelectionCache | null> => {
  const state = await getCalculatorCacheState();
  const selectionKey = getCalculatorSelectionKey(niveau, filiere, semestre);
  return state?.selections?.[selectionKey] ?? null;
};

export const updateCalculatorSelectionCache = async (
  selection: { niveau: string; filiere: string; semestre: string },
  patch: Partial<CalculatorSelectionCache> & { filieres?: unknown }
): Promise<void> => {
  try {
    const currentState = await getCalculatorCacheState();
    const selectionKey = getCalculatorSelectionKey(
      selection.niveau,
      selection.filiere,
      selection.semestre
    );

    const cleanedPatch = cleanData(patch) as Partial<CalculatorSelectionCache> & {
      filieres?: unknown;
    };
    const nextSelections = { ...(currentState?.selections ?? {}) };
    const nextSelection: CalculatorSelectionCache = {
      ...(nextSelections[selectionKey] ?? {}),
      ...cleanedPatch,
      updatedAt: Date.now(),
    };

    nextSelections[selectionKey] = nextSelection;

    const nextState: CalculatorCacheState = {
      version: 1,
      updatedAt: Date.now(),
      filieres:
        cleanedPatch.filieres !== undefined
          ? cleanData(cleanedPatch.filieres)
          : currentState?.filieres,
      modulesLookup:
        cleanedPatch.modulesLookup !== undefined
          ? cleanData(cleanedPatch.modulesLookup)
          : currentState?.modulesLookup,
      currentElems:
        cleanedPatch.currentElems !== undefined
          ? cleanData(cleanedPatch.currentElems)
          : currentState?.currentElems,
      historyElems:
        cleanedPatch.historyElems !== undefined
          ? cleanData(cleanedPatch.historyElems)
          : currentState?.historyElems,
      elementNames:
        cleanedPatch.elementNames !== undefined
          ? cleanData(cleanedPatch.elementNames)
          : currentState?.elementNames,
      selections: nextSelections,
    };

    await AsyncStorage.setItem(CALCULATOR_STATE_KEY, JSON.stringify(cleanData(nextState)));
  } catch (error) {
    console.error("Failed to update calculator cache:", error);
  }
};

export const buildCalculatorElementNames = (
  modulesLookup: unknown
): Record<string, string> => {
  const names: Record<string, string> = {};

  if (!modulesLookup || typeof modulesLookup !== "object" || Array.isArray(modulesLookup)) {
    return names;
  }

  for (const [moduleCode, moduleData] of Object.entries(
    modulesLookup as Record<string, any>
  )) {
    if (moduleData?.intitule) {
      names[moduleCode] = moduleData.intitule;
    }

    if (Array.isArray(moduleData?.elements)) {
      for (const element of moduleData.elements) {
        if (element?.code && element?.intitule) {
          names[element.code] = element.intitule;
        }
      }
    }
  }

  return names;
};

export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const skewlKeys = keys.filter(k => k.startsWith(CACHE_PREFIX) || k === ACTIVITY_KEY || k.startsWith("calc_storage_") || k === CALCULATOR_STATE_KEY);
    await AsyncStorage.multiRemove(skewlKeys);
    console.log("🧹 All app caches cleared");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};
