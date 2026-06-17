import { IAIAnalysisInput, IAIAnalysisResult } from '../../modules/moderation/moderation.types';

/**
 * The contract every AI provider implementation must satisfy.
 *
 * ENGINEERING DECISION — Interface-based abstraction (Strategy Pattern):
 *
 * The moderation service holds a reference to IAIProvider, NOT to
 * GeminiProvider or any concrete class. This means:
 *
 *  1. Swapping Gemini → OpenAI = change one line in ai-factory.ts.
 *  2. The moderation service is fully testable with a mock provider.
 *  3. Multiple providers can run in parallel for A/B testing — just
 *     instantiate two different implementations.
 *  4. Provider-specific concerns (API keys, SDK quirks, retry logic)
 *     are fully encapsulated inside each provider class.
 *
 * New providers must implement ONLY this interface. No changes to
 * business logic anywhere else in the codebase.
 */
export interface IAIProvider {
  /**
   * The provider's human-readable name for logging and audit records.
   * Example: "gemini", "openai", "claude"
   */
  readonly providerName: string;

  /**
   * The specific model version being used.
   * Example: "gemini-1.5-flash", "gpt-4o", "claude-3-5-sonnet"
   */
  readonly modelVersion: string;

  /**
   * Analyze a single image and return structured moderation results.
   * Implementations are responsible for their own retry/timeout logic.
   *
   * @throws AppError with statusCode 503 on provider unavailability.
   * @throws AppError with statusCode 422 on unparseable AI response.
   */
  analyzeImage(input: IAIAnalysisInput): Promise<IAIAnalysisResult>;
}
