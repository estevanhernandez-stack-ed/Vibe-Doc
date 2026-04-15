/**
 * Template Renderer Module
 * Renders templates with extracted and user-provided data
 */

import { logger } from '../utils/logger';

/**
 * Data provided to the renderer
 */
export interface RenderData {
  extracted: Record<string, string>;
  user: Record<string, string>;
  metadata: {
    docType: string;
    generatedAt: string;
    classification: string;
    sourceArtifacts: number;
  };
}

/**
 * Confidence level for a section's data
 */
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface SectionConfidence {
  section: string;
  confidence: ConfidenceLevel;
  source: 'extracted' | 'user' | 'empty';
}

/**
 * Render a template by replacing tokens with data
 * - {{extracted.<section-name>}} - auto-extracted data
 * - {{user.<section-name>}} - user-provided data
 * Marks empty sections with guidance comments
 * Tags confidence levels per section
 */
export function renderTemplate(template: string, data: RenderData): string {
  let rendered = template;
  const confidenceLevels: SectionConfidence[] = [];

  // Extract all token patterns
  // Supports both kebab-case (existing convention: service-overview) and
  // camelCase (new plugin-oriented templates: installSteps).
  const tokenPattern = /\{\{(extracted|user)\.([a-zA-Z0-9\-]+)\}\}/g;
  const tokens = new Map<string, string>();

  let match;
  while ((match = tokenPattern.exec(template)) !== null) {
    const [fullToken, scope, sectionName] = match;
    tokens.set(fullToken, sectionName);
  }

  // Replace tokens and track confidence
  for (const [token, sectionName] of tokens.entries()) {
    const [, scope] = token.match(/\{\{(extracted|user)/) || [];
    const source = scope as 'extracted' | 'user';
    
    const extractedValue = data.extracted[sectionName]?.trim() || '';
    const userValue = data.user[sectionName]?.trim() || '';
    
    // Prefer user-provided data over extracted
    let replacement: string;
    let confidence: ConfidenceLevel;
    let dataSource: 'extracted' | 'user' | 'empty';

    if (scope === 'user') {
      if (userValue) {
        replacement = userValue;
        confidence = 'high';
        dataSource = 'user';
      } else if (extractedValue) {
        // User section can show extracted data as fallback with medium confidence
        replacement = extractedValue;
        confidence = 'medium';
        dataSource = 'extracted';
      } else {
        replacement = '';
        confidence = 'low';
        dataSource = 'empty';
      }
    } else {
      // extracted scope
      if (extractedValue) {
        replacement = extractedValue;
        confidence = 'high';
        dataSource = 'extracted';
      } else {
        replacement = '';
        confidence = 'low';
        dataSource = 'empty';
      }
    }

    rendered = rendered.replace(token, replacement);
    confidenceLevels.push({ section: sectionName, confidence, source: dataSource });

    logger.debug('Rendered token', {
      sectionName,
      scope,
      confidence,
      hasData: !!replacement,
    });
  }

  // Mark empty sections with guidance comments
  const guidancePattern = /<!-- NEEDS INPUT: ([^-]*) -->/g;
  let guidanceIndex = 0;
  rendered = rendered.replace(guidancePattern, (match, guidance) => {
    if (guidanceIndex < confidenceLevels.length) {
      const { confidence } = confidenceLevels[guidanceIndex];
      if (confidence === 'low') {
        // Keep the guidance comment for empty sections
        guidanceIndex++;
        return match;
      }
    }
    guidanceIndex++;
    // Remove guidance comments for sections with data
    return '';
  });

  // Add confidence metadata as a comment at the top
  const confidenceSummary = generateConfidenceSummary(confidenceLevels);
  rendered = addMetadataComment(rendered, data.metadata, confidenceSummary);

  return rendered;
}

/**
 * Generate a summary of confidence levels per section
 */
function generateConfidenceSummary(levels: SectionConfidence[]): Record<string, ConfidenceLevel> {
  const summary: Record<string, ConfidenceLevel> = {};
  for (const { section, confidence } of levels) {
    summary[section] = confidence;
  }
  return summary;
}

/**
 * Add metadata comment to the rendered template
 */
function addMetadataComment(
  template: string,
  metadata: RenderData['metadata'],
  confidenceSummary: Record<string, ConfidenceLevel>,
): string {
  const frontmatterMatch = template.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    logger.warn('No frontmatter found in template');
    return template;
  }

  const frontmatterEnd = frontmatterMatch[0].length;
  const confidenceComment = generateConfidenceComment(metadata, confidenceSummary);

  return (
    template.slice(0, frontmatterEnd) +
    '\n' +
    confidenceComment +
    '\n' +
    template.slice(frontmatterEnd)
  );
}

/**
 * Generate a markdown comment with metadata and confidence levels
 */
function generateConfidenceComment(
  metadata: RenderData['metadata'],
  confidenceSummary: Record<string, ConfidenceLevel>,
): string {
  const highConfidence = Object.entries(confidenceSummary)
    .filter(([, level]) => level === 'high')
    .map(([section]) => section);

  const lowConfidence = Object.entries(confidenceSummary)
    .filter(([, level]) => level === 'low')
    .map(([section]) => section);

  const lines = [
    '<!--',
    `Generated: ${metadata.generatedAt}`,
    `Classification: ${metadata.classification}`,
    `Source artifacts: ${metadata.sourceArtifacts}`,
    `High confidence sections: ${highConfidence.length} - ${highConfidence.join(', ') || 'none'}`,
    `Needs input: ${lowConfidence.length} - ${lowConfidence.join(', ') || 'none'}`,
    '-->',
  ];

  return lines.join('\n');
}
