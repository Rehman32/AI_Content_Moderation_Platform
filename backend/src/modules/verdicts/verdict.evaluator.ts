import { ICategoryResult, ModerationCategory } from '../moderation/moderation.types';
import {
  IPolicyRule,
  IPolicyVersion,
  ModerationAction,
  ContentCategory,
} from '../policies/policy.interface';
import { VerdictOutcome, ITriggeredRule } from './verdict.types';

/**
 * The output of a single policy evaluation run.
 */
export interface IEvaluationResult {
  finalOutcome: VerdictOutcome;
  triggeredRules: ITriggeredRule[];
  reasoning: string;
}

/**
 * Category name bridge: ModerationCategory → ContentCategory.
 *
 * WHY THIS EXISTS:
 * The AI module uses ModerationCategory (e.g. "Violence") — the AI provider's
 * vocabulary for what it can detect in images.
 *
 * The Policy module uses ContentCategory (e.g. "VIOLENCE") — the platform's
 * vocabulary for what rules govern.
 *
 * They share semantics but not naming conventions because they evolve
 * independently (see moderation.types.ts). This map is the single authoritative
 * translation layer between those two namespaces. If a new AI category is added,
 * this is the ONLY place that needs updating to connect it to policy enforcement.
 */
const AI_TO_POLICY_CATEGORY_MAP: Partial<Record<ModerationCategory, ContentCategory>> = {
  [ModerationCategory.VIOLENCE]:      ContentCategory.VIOLENCE,
  [ModerationCategory.WEAPONS]:       ContentCategory.VIOLENCE,  // Weapons → VIOLENCE policy rule
  [ModerationCategory.ADULT_CONTENT]: ContentCategory.SEXUAL_CONTENT,
  [ModerationCategory.SELF_HARM]:     ContentCategory.SELF_HARM,
  [ModerationCategory.HARASSMENT]:    ContentCategory.HARASSMENT,
  [ModerationCategory.EXTREMISM]:     ContentCategory.HATE_SPEECH,
};

/**
 * Map a policy ModerationAction to a VerdictOutcome.
 *
 * ENGINEERING DECISION — Explicit outcome mapping (no implicit fallback):
 * Every ModerationAction has a defined VerdictOutcome mapping. Unknown
 * actions default to FLAGGED_FOR_REVIEW rather than silently APPROVED.
 * This is the safe-fail direction: uncertain = flag for human review.
 */
function actionToOutcome(action: ModerationAction): VerdictOutcome {
  switch (action) {
    case ModerationAction.APPROVE:
      return VerdictOutcome.APPROVED;

    case ModerationAction.REJECT:
      return VerdictOutcome.BLOCKED;

    case ModerationAction.FLAG:
    case ModerationAction.HOLD:
    case ModerationAction.ESCALATE:
      return VerdictOutcome.FLAGGED_FOR_REVIEW;

    default:
      // Safe-fail: unknown action → flag for human decision
      return VerdictOutcome.FLAGGED_FOR_REVIEW;
  }
}

/**
 * SEVERITY PRIORITY ORDER for tie-breaking.
 * When multiple rules fire, the one with the highest severity wins.
 *
 * BLOCKED > FLAGGED_FOR_REVIEW > APPROVED
 * This is the strictest-wins principle — if any rule says BLOCK, we block.
 */
const OUTCOME_PRIORITY: Record<VerdictOutcome, number> = {
  [VerdictOutcome.BLOCKED]: 3,
  [VerdictOutcome.FLAGGED_FOR_REVIEW]: 2,
  [VerdictOutcome.APPROVED]: 1,
};

/**
 * PolicyEvaluationEngine
 *
 * THE CORE SEPARATION OF CONCERNS:
 *
 * WHY AI MUST NEVER DIRECTLY DETERMINE FINAL VERDICTS:
 *
 * 1. DETERMINISM & AUDITABILITY:
 *    AI confidence scores are probabilistic — they vary between runs and
 *    model versions. If Gemini says 0.91 for Violence today and 0.88 tomorrow
 *    (same image, model update), the verdict should NOT change unless the
 *    POLICY threshold changed. The policy rule is the deterministic gate.
 *    Humans can audit "why was this blocked?" by reading the policy — not
 *    by trying to reconstruct AI internals.
 *
 * 2. GOVERNANCE & ACCOUNTABILITY:
 *    Regulators (GDPR, DSA, etc.) require content moderation decisions to be
 *    explainable by human-authored rules. "The AI flagged it" is not a legally
 *    defensible answer. "Policy v3, Rule: Violence threshold 0.70, AI score: 0.91"
 *    is.
 *
 * 3. POLICY VERSIONING INTEGRITY:
 *    The verdicts module guaranteed historical immutability by storing
 *    policyVersionId on every verdict. If the AI directly set outcomes,
 *    there would be no policy version to reference — the "policy" would
 *    just be "whatever the AI decided that day."
 *
 * 4. SAFETY:
 *    AI hallucinations, prompt injections, or model degradation could cause
 *    an AI to return wildly incorrect confidence scores. The policy threshold
 *    is the circuit breaker — it absorbs AI variance and enforces human intent.
 */
export class PolicyEvaluationEngine {
  /**
   * Evaluate a set of AI category results against a policy version.
   *
   * ALGORITHM:
   *  1. For each AI category result, look up the mapped ContentCategory.
   *  2. Find the corresponding PolicyRule (if it exists and is enabled).
   *  3. If AI confidence >= rule's confidenceThreshold → rule fires.
   *  4. Collect all triggered rules with their outcomes.
   *  5. Final outcome = highest-priority outcome across all triggered rules.
   *  6. If no rules fire → APPROVED.
   *
   * STRICTEST-WINS PRINCIPLE:
   *  If Violence fires (BLOCKED) and Harassment fires (FLAGGED), final = BLOCKED.
   *  This prevents the edge case where one severe violation is masked by
   *  many minor-but-approved categories.
   */
  public evaluate(
    aiResults: ICategoryResult[],
    policy: IPolicyVersion
  ): IEvaluationResult {
    const triggeredRules: ITriggeredRule[] = [];
    let highestOutcome: VerdictOutcome = VerdictOutcome.APPROVED;

    // Build a fast lookup map: ContentCategory → PolicyRule
    const ruleMap = new Map<ContentCategory, IPolicyRule>();
    for (const rule of policy.rules) {
      if (rule.enabled) {
        ruleMap.set(rule.category, rule);
      }
    }

    for (const aiCategory of aiResults) {
      // Bridge: translate AI category name → policy category name
      const policyCategory = AI_TO_POLICY_CATEGORY_MAP[aiCategory.name];
      if (!policyCategory) {
        // AI detected something the policy doesn't have a rule for → skip
        continue;
      }

      const rule = ruleMap.get(policyCategory);
      if (!rule) {
        // No enabled policy rule for this category → skip
        continue;
      }

      // THE THRESHOLD GATE — this is the deterministic heart of the engine
      if (aiCategory.confidence >= rule.confidenceThreshold) {
        const triggeredOutcome = actionToOutcome(rule.action);

        triggeredRules.push({
          category: aiCategory.name,
          policyAction: rule.action,
          policyThreshold: rule.confidenceThreshold,
          aiConfidence: aiCategory.confidence,
          reasoning: aiCategory.reasoning,
        });

        // Strictest-wins: keep the highest-priority outcome
        if (OUTCOME_PRIORITY[triggeredOutcome] > OUTCOME_PRIORITY[highestOutcome]) {
          highestOutcome = triggeredOutcome;
        }
      }
    }

    const reasoning = this.buildReasoning(highestOutcome, triggeredRules, policy);

    return {
      finalOutcome: highestOutcome,
      triggeredRules,
      reasoning,
    };
  }

  /**
   * Build a human-readable, self-contained reasoning string.
   * This string is stored verbatim on the verdict and must be
   * understandable WITHOUT access to the source policy document.
   */
  private buildReasoning(
    outcome: VerdictOutcome,
    triggeredRules: ITriggeredRule[],
    policy: IPolicyVersion
  ): string {
    if (outcome === VerdictOutcome.APPROVED) {
      return (
        `Content approved under policy "${policy.name}" (v${policy.versionNumber}). ` +
        `No policy thresholds were exceeded.`
      );
    }

    const ruleDescriptions = triggeredRules.map(
      (r) =>
        `${r.category}: AI confidence ${(r.aiConfidence * 100).toFixed(1)}% ` +
        `exceeded policy threshold ${(r.policyThreshold * 100).toFixed(1)}% ` +
        `(action: ${r.policyAction})`
    );

    const prefix =
      outcome === VerdictOutcome.BLOCKED
        ? 'Content BLOCKED'
        : 'Content FLAGGED FOR REVIEW';

    return (
      `${prefix} under policy "${policy.name}" (v${policy.versionNumber}). ` +
      `Triggered rules: ${ruleDescriptions.join('; ')}.`
    );
  }
}
