/**
 * Canonical set of content categories this platform understands.
 *
 * ENGINEERING DECISION — Separate enum from ContentCategory in policy.interface:
 * The policy module uses ContentCategory to describe *rules* (what to do when
 * detected). The AI module uses ModerationCategory to describe *what it looks for*.
 * They happen to share values today, but they evolve independently:
 *  - A new AI model may detect "Deep_Fake" before we have a policy rule for it.
 *  - A policy may have rules for "Spam" that the vision AI doesn't detect.
 * Keeping them decoupled prevents cross-module coupling on type changes.
 */
export enum ModerationCategory {
  VIOLENCE = 'Violence',
  WEAPONS = 'Weapons',
  ADULT_CONTENT = 'Adult_Content',
  SELF_HARM = 'Self_Harm',
  HARASSMENT = 'Harassment',
  EXTREMISM = 'Extremism',
}

/**
 * The structured result for one category from the AI provider.
 */
export interface ICategoryResult {
  name: ModerationCategory;
  confidence: number;     // 0.0 – 1.0
  flagged: boolean;       // true when confidence >= threshold
  reasoning: string;      // Human-readable explanation from the AI
}

/**
 * The complete structured output returned by any AI provider for one image.
 *
 * DESIGN DECISION — Explicit `safe` flag + `overallRisk`:
 * Downstream consumers (verdict module, policy engine) should not need to
 * iterate the categories array to determine if an image is safe. The `safe`
 * flag and `overallRisk` score are computed summaries for fast reads.
 */
export interface IAIAnalysisResult {
  safe: boolean;                      // True only when NO category is flagged
  overallRisk: number;                // Max confidence across all flagged categories
  categories: ICategoryResult[];
  analyzedAt: Date;
  providerName: string;               // Which AI provider produced this result
  modelVersion: string;               // Which model version was used
  processingTimeMs: number;           // Round-trip time to AI provider
}

/**
 * Input payload fed to any AI provider for image analysis.
 * Using a base64 encoded buffer and mime type keeps the interface
 * storage-agnostic — the caller handles reading the file.
 */
export interface IAIAnalysisInput {
  imageBuffer: Buffer;
  mimeType: string;
  imageId: string;          // For logging/tracing only
}

/**
 * Moderation result persisted to the database (stored on the Image document).
 * This is the subset of IAIAnalysisResult that goes into MongoDB.
 */
export interface IModerationResult {
  safe: boolean;
  overallRisk: number;
  categories: ICategoryResult[];
  analyzedAt: Date;
  providerName: string;
  modelVersion: string;
  processingTimeMs: number;
}
