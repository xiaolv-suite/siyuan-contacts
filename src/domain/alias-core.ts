export interface PersonAlias {
    id: string;
    personDocId: string;
    alias: string;
    createdAt: number;
    updatedAt: number;
}

export interface PersonAliasStore {
    schemaVersion: 1;
    aliases: PersonAlias[];
    tombstones?: string[];
}

export function normalizeAliasKey(alias: string): string {
    return alias.trim().toLocaleLowerCase();
}
