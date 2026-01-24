export interface LoginResponse {
  success: boolean;
  csrfToken: string;
  message?: string;
}

export interface UserProfile {
  basic_info: {
    photo_url: string;
    large_photo_url?: string;
    full_name: string;
    role: string;
    welcome_message: string;
  };
  academic_info: Record<string, string>;
  administrative_info: {
    Code: string;
    Filiere: string;
    Filière?: string;
    Niveau: string;
    Statut: string;
    Section: string;
    Groupe: string;
    ["Sous Groupe"]: string;
  };
  personal_info: Record<string, string>;
  contact_info: Record<string, string>;
  family_info: Record<string, string>;
  download_links?: {
    attestation_scolarite: string;
  };
  session_id?: string;
}

export interface Element {
  id: string;
  name: string;
  code?: string;
  note?: number;
  coefficient?: number;
  [key: string]: unknown;
}

export interface Module {
  id: string;
  name: string;
  code?: string;
  elements?: Element[];
  note?: number;
  coefficient?: number;
  [key: string]: unknown;
}

export interface Semestre {
  id: string;
  name: string;
  moyenne?: number;
  modules?: Module[];
  [key: string]: unknown;
}

export interface Annee {
  id: string;
  name: string;
  moyenne?: number;
  semestres?: Semestre[];
  [key: string]: unknown;
}

export interface Absence {
  id: string;
  date: string;
  module: string;
  justified: boolean;
  hours?: number;
  [key: string]: unknown;
}

export interface Sanction {
  id: string;
  date: string;
  type: string;
  description: string;
  [key: string]: unknown;
}

export interface Filiere {
  id: string;
  name: string;
  code?: string;
  [key: string]: unknown;
}

export interface ASFData {
  annees: Annee[];
  semestres: Semestre[];
  filieres: Filiere[];
}

export interface GetModulesRequest {
  annee: string;
  semestre: string;
  filiere: string;
}

export interface ActivityItem {
  id: string;
  type: "note" | "absence" | "sanction" | "update";
  title: string;
  description: string;
  timestamp: number;
  route?: string;
}
