declare module "schoolapp" {
  export interface CookieJar {
    get(url: string): Promise<string>;
    set(url: string, cookie: string): Promise<unknown>;
    clear(): Promise<void>;
  }

  export interface HttpResponse {
    code: number | null;
    url: string | null;
    content: string | null;
  }

  export class HTTPClient {
    constructor(baseUrl: string);
    baseUrl: string;
    cookieJar: CookieJar;
    onUnauthorized: (() => void) | null;
    client: unknown;
    setUnauthorizedHandler(handler: () => void): void;
    resetSession(): Promise<void>;
    get(url: string, params?: Record<string, unknown> | null): Promise<HttpResponse>;
    post(
      url: string,
      data: Record<string, unknown>,
      referer?: string | null
    ): Promise<HttpResponse>;
  }

  export class AuthManager {
    constructor(httpClient: HTTPClient, baseUrl: string);
    httpClient: HTTPClient;
    baseUrl: string;
    csrfToken: string | null;
    loggedIn: boolean;
    login(email: string, password: string): Promise<boolean>;
    logout(): Promise<void>;
    resetAuthState(): void;
    isLoggedIn(): boolean;
    isAuthSuspect(): boolean;
    setLoginState(state: boolean): void;
    checkSession(): Promise<boolean>;
    confirmSessionLoss(): Promise<boolean>;
    refreshCsrfFromUrl(url: string): Promise<boolean>;
  }

  export class GradesManager {
    getElementNotes(current?: boolean): Promise<Element[]>;
    getModuleNotes(current?: boolean): Promise<Module[]>;
    getYears(): Promise<Annee[]>;
    getSemesters(): Promise<Semestre[]>;
  }

  export class AttendanceManager {
    getAbsences(): Promise<Record<string, unknown> | null>;
    getSanctions(): Promise<Record<string, unknown> | null>;
  }

  export class ProfileManager {
    getProfile(): Promise<Record<string, unknown> | null>;
    getFilieres(): Promise<Record<string, unknown>[] | null>;
  }

  export class CourseManager {
    getModules(
      niveau: string,
      filiere: string,
      semestre: string,
      refreshCsrf?: boolean
    ): Promise<ModulesData | null>;
  }

  export class SchoolAppClient {
    constructor(baseUrl?: string);
    baseUrl: string;
    httpClient: HTTPClient;
    auth: AuthManager;
    grades: GradesManager;
    attendance: AttendanceManager;
    profile: ProfileManager;
    courses: CourseManager;
    login(email: string, password: string): Promise<boolean>;
    logout(): Promise<void>;
    resetSession(): Promise<void>;
    getProfile(): Promise<Record<string, unknown> | null>;
    getFilieres(): Promise<Record<string, unknown>[] | null>;
    getAbsences(): Promise<Record<string, unknown> | null>;
    getSanctions(): Promise<Record<string, unknown> | null>;
    getElemNote(): Promise<Element[]>;
    getCurrentElemNote(): Promise<Element[]>;
    getModNote(): Promise<Module[]>;
    getCurrentModNote(): Promise<Module[]>;
    getAnnee(): Promise<Annee[]>;
    getSemestre(): Promise<Semestre[]>;
    getModules(
      niveau: string,
      filiere: string,
      semestre: string,
      refreshCsrf?: boolean
    ): Promise<ModulesData | null>;
  }

  export interface ElementInfo {
    code: string;
    intitule: string;
    vh_ctd?: number;
    vh_tp?: number;
    vh_eval?: number;
    coef_cc?: number;
    coef_ex?: number;
    coef_ecrit?: number;
    coef_tp?: number;
    coef_elem?: number;
    [key: string]: unknown;
  }

  export interface ModuleInfo {
    intitule: string;
    niveau?: string;
    semestre?: string;
    vhmod?: number;
    coef?: number;
    seuil?: number;
    eliminatoire?: number;
    elements: ElementInfo[];
    [key: string]: unknown;
  }

  export type ModulesData = Record<string, ModuleInfo>;

  export class Element {
    client: SchoolAppClient;
    [key: string]: unknown;
    ccStats(): Promise<Record<string, unknown> | null>;
    exStats(): Promise<Record<string, unknown> | null>;
    tpStats(): Promise<Record<string, unknown> | null>;
    moyStats(): Promise<Record<string, unknown> | null>;
  }

  export class Module {
    client: SchoolAppClient;
    [key: string]: unknown;
    stats(): Promise<Record<string, unknown> | null>;
  }

  export class Semestre {
    client: SchoolAppClient;
    [key: string]: unknown;
    stats(): Promise<Record<string, unknown> | null>;
  }

  export class Annee {
    client: SchoolAppClient;
    [key: string]: unknown;
    stats(): Promise<Record<string, unknown> | null>;
  }
}
