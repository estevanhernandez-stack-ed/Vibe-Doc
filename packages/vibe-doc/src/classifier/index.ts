/**
 * Classifier Orchestrator
 * Main entry point for hybrid classification
 */

import { ArtifactInventory, Classification, DeploymentContext } from '../state/schema';
import { logger } from '../utils/logger';
import { extractSignals, Signal } from './signals';
import { scoreClassification, ScoringResult, Category, Context } from './scoring-engine';
import { buildClassificationPrompt } from './llm-prompt';

export interface ClassificationOptions {
  confidenceThreshold?: number; // Default: 0.85
}

export interface ClassificationResult {
  resolved: boolean;
  classification?: Classification;
  llmPrompt?: string;
  candidates?: Array<{ category: string; score: number }>;
  contexts?: string[];
}

/**
 * Classify a project based on artifact inventory
 * Returns either a high-confidence classification or a prompt for LLM fallback
 * @param inventory - Artifact inventory from scanner
 * @param options - Classification options (confidenceThreshold, etc.)
 */
export function classify(
  inventory: ArtifactInventory,
  options?: ClassificationOptions
): ClassificationResult {
  const confidenceThreshold = options?.confidenceThreshold ?? 0.85;

  logger.info('Starting hybrid classification', { confidenceThreshold });

  // Step 1: Extract signals from inventory
  const signals = extractSignals(inventory);
  logger.info('Signals extracted', { count: signals.length });

  // Step 2: Run scoring engine
  const ruleResults = scoreClassification(signals, confidenceThreshold);
  logger.info('Rule-based scoring complete', {
    confidence: ruleResults.confidence,
    topCategory: ruleResults.categories[0],
  });

  // Step 3: Check confidence threshold
  if (ruleResults.confidence >= confidenceThreshold) {
    // High confidence - return classification directly
    const classification = buildClassification(ruleResults, inventory);
    logger.info('Classification resolved with high confidence', {
      category: classification.primaryCategory,
      confidence: classification.confidence,
    });

    return {
      resolved: true,
      classification,
    };
  }

  // Low confidence - build classification from best candidate and prepare LLM prompt
  logger.info('Classification confidence too low, building from best candidate', {
    confidence: ruleResults.confidence,
    topCandidate: ruleResults.categories[0]?.category,
  });

  const llmPrompt = buildClassificationPrompt(inventory, ruleResults);
  const classification = buildLowConfidenceClassification(ruleResults, inventory);

  return {
    resolved: false,
    classification,
    llmPrompt,
    candidates: ruleResults.categories.map((c) => ({
      category: c.category,
      score: c.score,
    })),
    contexts: ruleResults.contexts.map((c) => c.context as string),
  };
}

const SECONDARY_RATIO_THRESHOLD = 0.3;

/**
 * Pick a secondary category only when it's substantively close to primary.
 * Universal-floor signals (has-tests, has-dockerfile, has-e2e-testing) give
 * every category a small baseline score; reporting whatever lands second
 * surfaces confidently-wrong secondaries (e.g., WebApplication on a pure
 * plugin repo where primary scores 30+ and secondary scores 1.5 from
 * floors alone). Threshold: secondary needs >= 30% of primary's score
 * AND a positive absolute score to be reported.
 */
function pickSecondary(
  primary: { category: string; score: number },
  candidates: Array<{ category: string; score: number }>
): { category: string; score: number } | null {
  if (candidates.length < 2) return null;
  const candidate = candidates[1];
  if (candidate.score <= 0 || primary.score <= 0) return null;
  if (candidate.score / primary.score < SECONDARY_RATIO_THRESHOLD) return null;
  return candidate;
}

/**
 * Build a Classification object from scoring results
 */
function buildClassification(
  ruleResults: ScoringResult,
  inventory: ArtifactInventory
): Classification {
  const topCategory = ruleResults.categories[0];
  const secondaryCategory = pickSecondary(topCategory, ruleResults.categories);

  const contexts = ruleResults.contexts.map((c) => c.context);

  // Map category to deployment context
  const deploymentContext: DeploymentContext[] = mapCategoryToDeploymentContext(
    topCategory.category as Category,
    contexts as Context[]
  );

  return {
    primaryCategory: topCategory.category as string,
    secondaryCategory: secondaryCategory?.category || '',
    deploymentContext,
    contextModifiers: contexts as string[],
    confidence: ruleResults.confidence,
    rationale: buildRationale(topCategory.category as Category, contexts as Context[]),
    userConfirmed: false,
  };
}

/**
 * Build a Classification object from low-confidence scoring results
 * Uses the best candidate with actual confidence score and contexts
 */
function buildLowConfidenceClassification(
  ruleResults: ScoringResult,
  inventory: ArtifactInventory
): Classification {
  const topCategory = ruleResults.categories[0];
  const secondaryCategory = pickSecondary(topCategory, ruleResults.categories);

  const contexts = ruleResults.contexts.map((c) => c.context);

  // Map category to deployment context
  const deploymentContext: DeploymentContext[] = mapCategoryToDeploymentContext(
    topCategory.category as Category,
    contexts as Context[]
  );

  // Build rationale noting that LLM review is available
  const baseRationale = buildRationale(topCategory.category as Category, contexts as Context[]);
  const reviewNote = ' [LLM review available to increase confidence]';

  return {
    primaryCategory: topCategory.category as string,
    secondaryCategory: secondaryCategory?.category || '',
    deploymentContext,
    contextModifiers: contexts as string[],
    confidence: ruleResults.confidence,
    rationale: baseRationale + reviewNote,
    userConfirmed: false,
  };
}

/**
 * Map category and contexts to deployment context
 */
function mapCategoryToDeploymentContext(
  category: Category,
  contexts: Context[]
): DeploymentContext[] {
  const result: DeploymentContext[] = [];

  // Determine platform based on category
  // TODO: these platform/environment/scale strings are untyped magic strings —
  // worth promoting to enums when the classifier gets its next overhaul.
  let platform = 'cloud';
  if (category === Category.MobileApplication) {
    platform = 'mobile';
  } else if (category === Category.InfrastructurePlatform) {
    platform = 'kubernetes';
  } else if (category === Category.ClaudeCodePlugin) {
    platform = 'plugin';
  }

  // Check for EdgeEmbedded context
  if (contexts.includes(Context.EdgeEmbedded)) {
    platform = 'edge';
  }

  // Determine environment based on contexts
  let environment = 'production';
  if (contexts.includes(Context.InternalTooling)) {
    environment = 'staging';
  }
  if (category === Category.ClaudeCodePlugin) {
    // Plugins are distributed, not deployed in the SaaS sense
    environment = 'distribution';
  }

  // Determine scale based on contexts
  let scale = 'small';
  if (contexts.includes(Context.CustomerFacing)) {
    scale = 'large';
  } else if (contexts.includes(Context.MultiTenant)) {
    scale = 'large';
  }

  result.push({ platform, environment, scale });

  return result;
}

/**
 * Build a rationale string for the classification
 */
function buildRationale(category: Category, contexts: Context[]): string {
  const parts: string[] = [];
  parts.push(`Primary category: ${category}`);
  if (contexts.length > 0) {
    parts.push(`Contexts: ${contexts.join(', ')}`);
  }
  return parts.join('. ');
}
