declare module 'schoolapp' {
    export class SchoolAppClient {
        constructor(baseUrl?: string);
        login(email: string, password: string): Promise<boolean>;
        getProfile(): Promise<any>;
        getFilieres(): Promise<any[]>;
        getAbsences(): Promise<any>;
        getSanctions(): Promise<any>;
        getElemNote(): Promise<any[]>;
        getCurrentElemNote(): Promise<any[]>;
        getModNote(): Promise<any[]>;
        getCurrentModNote(): Promise<any[]>;
        getAnnee(): Promise<any[]>;
        getSemestre(): Promise<any[]>;
        getModules(niveau: string, filiere: string, semestre: string, refreshCsrf?: boolean): Promise<any>;
        auth: {
            isLoggedIn(): boolean;
            setLoginState(state: boolean): void;
        };
    }
}
