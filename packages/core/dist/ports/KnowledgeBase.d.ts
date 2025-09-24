export interface KBItem {
    pattern: string;
    fix: string;
    doc?: string;
}
export interface KnowledgeBasePort {
    lookup(query: string): Promise<KBItem[]>;
}
//# sourceMappingURL=KnowledgeBase.d.ts.map