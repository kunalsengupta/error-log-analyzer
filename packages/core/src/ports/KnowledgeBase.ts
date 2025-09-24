export interface KBItem {
pattern: string; // substring or regex source
fix: string;
doc?: string; // optional URL or note
}

export interface KnowledgeBasePort {
lookup(query: string): Promise<KBItem[]>;
}