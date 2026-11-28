import type { ExtractionResult } from "./ai-extract.ts";
import type { AiCandidateDraft } from "./ai-candidates.ts";
import type { ContactSummary } from "./person.ts";
import type { AiPreflight } from "./ai-preflight.ts";

export interface AiExtractOutcome {
    extraction: ExtractionResult | null;
    likelyUnconfigured: boolean;
    matched: ContactSummary[];
    unknownNames: string[];
    ambiguousCandidates?: Array<{ name: string; people: ContactSummary[] }>;
    candidates: AiCandidateDraft[];
    preflightId: string;
}

export interface AiExtractionConfirmation {
    preflight: AiPreflight;
    confirmed: true;
    signal?: AbortSignal;
    timeoutMs?: number;
}
