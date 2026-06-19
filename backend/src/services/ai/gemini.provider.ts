import { GoogleGenAI } from '@google/genai';
import { env } from '../../config/env.config';
import { IAIProvider } from './ai-provider.interface';
import {
  IAIAnalysisInput,
  IAIAnalysisResult,
  ICategoryResult,
  ModerationCategory,
} from '../../modules/moderation/moderation.types';
import { AppError } from '../../utils/AppError';

/**
 * Gemini Vision provider implementation.
 *
 * ENGINEERING DECISIONS:
 *
 * 1. RETRY WITH EXPONENTIAL BACKOFF:
 *    Gemini (like all external APIs) can return transient 429/503 errors.
 *    We retry up to MAX_RETRIES times with exponential backoff + jitter
 *    to avoid thundering herd when multiple images are analyzed concurrently.
 *
 * 2. TIMEOUT GUARD:
 *    We wrap the Gemini call in a Promise.race() against a timeout sentinel.
 *    Without this, a hung network call would block the server indefinitely.
 *
 * 3. STRUCTURED PROMPT ENGINEERING:
 *    The prompt explicitly instructs Gemini to return JSON. We ask for
 *    confidence 0.0–1.0 and a reasoning string. The JSON is parsed and
 *    validated — if the AI returns malformed output, we fail gracefully
 *    rather than propagating corrupt data downstream.
 *
 * 4. GRACEFUL FAILURE:
 *    If all retries are exhausted or the AI returns unparseable output,
 *    we throw a typed AppError (503/422) that the moderation service
 *    catches and records as ImageStatus.FAILED — never crashing the server.
 */

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 500;
const TIMEOUT_MS = 30_000; // 30 seconds per image

const SYSTEM_PROMPT = `
You are a professional AI content moderation system.
Analyze the provided image and return a JSON object with EXACTLY this structure:

{
  "categories": [
    {
      "name": "<category>",
      "confidence": <float 0.0-1.0>,
      "reasoning": "<one sentence explanation>"
    }
  ]
}

You MUST evaluate ALL of the following categories, even if confidence is 0.0:
- Violence
- Weapons
- Adult_Content
- Self_Harm
- Harassment
- Extremism

Rules:
- confidence must be a float between 0.0 and 1.0
- reasoning must be a single concise sentence
- Return ONLY the JSON object, no markdown, no code fences, no extra text
`.trim();

export class GeminiProvider implements IAIProvider {
  public readonly providerName = 'gemini';
  public readonly modelVersion = env.GEMINI_MODEL;

  private readonly client: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  public async analyzeImage(input: IAIAnalysisInput): Promise<IAIAnalysisResult> {
    const startTime = Date.now();

    console.log(`[GeminiProvider] Starting analysis for image: ${input.imageId}`);

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.callWithTimeout(input, attempt);
        const processingTimeMs = Date.now() - startTime;

        console.log(
          `[GeminiProvider] Analysis complete for ${input.imageId} ` +
          `in ${processingTimeMs}ms (attempt ${attempt})`
        );

        return { ...result, processingTimeMs };

      } catch (error: any) {
        lastError = error;
        const isRetryable = this.isRetryableError(error);

        console.warn(
          `[GeminiProvider] Attempt ${attempt}/${MAX_RETRIES} failed for ${input.imageId}: ` +
          `${error?.message || error}`
        );

        if (!isRetryable || attempt === MAX_RETRIES) break;

        // Exponential backoff with jitter
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
        console.log(`[GeminiProvider] Retrying in ${Math.round(delay)}ms...`);
        await this.sleep(delay);
      }
    }

    console.error(
      `[GeminiProvider] All ${MAX_RETRIES} attempts failed for image: ${input.imageId}`
    );

    throw new AppError(
      `AI provider failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`,
      503
    );
  }

  /**
   * Wraps the actual Gemini API call with a hard timeout.
   */
  private async callWithTimeout(
    input: IAIAnalysisInput,
    attempt: number
  ): Promise<Omit<IAIAnalysisResult, 'processingTimeMs'>> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Gemini API timeout after ${TIMEOUT_MS}ms`)),
        TIMEOUT_MS
      )
    );

    const apiPromise = this.callGeminiAPI(input);

    return Promise.race([apiPromise, timeoutPromise]);
  }

  /**
   * The actual Gemini Vision API call.
   */
  private async callGeminiAPI(
    input: IAIAnalysisInput
  ): Promise<Omit<IAIAnalysisResult, 'processingTimeMs'>> {
    const base64Image = input.imageBuffer.toString('base64');

    const response = await this.client.models.generateContent({
      model: this.modelVersion,
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                mimeType: input.mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
    });

    const rawText = response.text;

    if (!rawText) {
      throw new AppError('Gemini returned an empty response', 422);
    }

    return this.parseAndValidateResponse(rawText);
  }

  /**
   * Parses and validates the raw text response from Gemini.
   * Gemini sometimes wraps JSON in markdown code fences — we strip those.
   */
  private parseAndValidateResponse(
    rawText: string
  ): Omit<IAIAnalysisResult, 'processingTimeMs'> {
    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[GeminiProvider] Failed to parse JSON response:', rawText);
      throw new AppError('AI provider returned malformed JSON', 422);
    }

    if (!Array.isArray(parsed?.categories)) {
      throw new AppError('AI response missing required "categories" array', 422);
    }

    const CONFIDENCE_THRESHOLD = 0.5;

    const categories: ICategoryResult[] = parsed.categories.map((cat: any) => {
      const name = cat.name as ModerationCategory;
      const confidence = typeof cat.confidence === 'number'
        ? Math.min(1, Math.max(0, cat.confidence))
        : 0;

      return {
        name,
        confidence,
        flagged: confidence >= CONFIDENCE_THRESHOLD,
        reasoning: typeof cat.reasoning === 'string' ? cat.reasoning : '',
      };
    });

    const flaggedCategories = categories.filter((c) => c.flagged);
    const overallRisk = flaggedCategories.length > 0
      ? Math.max(...flaggedCategories.map((c) => c.confidence))
      : 0;

    return {
      safe: flaggedCategories.length === 0,
      overallRisk,
      categories,
      analyzedAt: new Date(),
      providerName: this.providerName,
      modelVersion: this.modelVersion,
    };
  }

  /**
   * Determines whether an error warrants a retry attempt.
   * Rate limits (429) and server errors (5xx) are retryable.
   * Bad requests (4xx) and parse errors are not.
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof AppError) {
      // 422 (parse error) is not retryable — the same call will fail again
      return error.statusCode !== 422;
    }
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('timeout') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('503') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
