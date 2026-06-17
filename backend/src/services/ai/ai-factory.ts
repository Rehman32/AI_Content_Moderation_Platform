import { IAIProvider } from './ai-provider.interface';
import { GeminiProvider } from './gemini.provider';

/**
 * AI Provider Factory.
 *
 * ENGINEERING DECISION — Factory + Singleton per provider:
 *
 * The factory serves two purposes:
 *  1. SELECTION: Reads AI_PROVIDER env var to determine which provider to use.
 *     Adding a new provider = add one case here. Zero other code changes.
 *  2. SINGLETON: Provider instances are expensive to create (they hold HTTP
 *     connection pools and validate API keys). The factory caches the instance
 *     so the moderation service always gets the same object.
 *
 * To switch from Gemini to OpenAI:
 *   Set AI_PROVIDER=openai in .env — no code changes required.
 *
 * To add a new provider (e.g. Claude):
 *   1. Create src/services/ai/claude.provider.ts implementing IAIProvider.
 *   2. Add case 'claude' below.
 *   That's it. The moderation service, controller, and routes are untouched.
 */

type SupportedProvider = 'gemini' | 'openai' | 'claude';

let cachedProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase() as SupportedProvider;

  console.log(`[AIFactory] Initializing AI provider: ${providerName}`);

  switch (providerName) {
    case 'gemini':
      cachedProvider = new GeminiProvider();
      break;

    // Placeholder stubs — remove the comments and implement when ready
    // case 'openai':
    //   cachedProvider = new OpenAIProvider();
    //   break;

    // case 'claude':
    //   cachedProvider = new ClaudeProvider();
    //   break;

    default:
      throw new Error(
        `Unsupported AI provider: "${providerName}". ` +
        `Supported values: gemini. Set AI_PROVIDER in your .env file.`
      );
  }

  return cachedProvider;
}

/**
 * Resets the cached provider instance.
 * Useful in tests to inject a mock provider between test cases.
 */
export function resetAIProvider(): void {
  cachedProvider = null;
}
