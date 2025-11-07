import {Session} from "../entities/Session";


export interface ISessionRepository {
    list(): Promise<Session[]>;
    create(): Promise<Session>;
    getById(id: string): Promise<Session | null>;
    delete(id: string): Promise<void>;
}

