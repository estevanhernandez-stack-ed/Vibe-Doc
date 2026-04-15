/**
 * Diff Summary Generator
 * Produces human-readable summaries of changes between document versions
 */

import * as Diff from 'diff';

export interface DiffSummary {
  sectionsAdded: string[];
  sectionsRemoved: string[];
  sectionsChanged: string[];
  linesAdded: number;
  linesRemoved: number;
  summary: string;
}

/**
 * Generate a diff summary between two document versions
 * @param oldContent - Previous version content
 * @param newContent - New version content
 * @returns DiffSummary with changes and statistics
 */
export function generateDiffSummary(oldContent: string, newContent: string): DiffSummary {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  // Get line-level changes
  const changes = Diff.diffLines(oldContent, newContent);

  // Count additions and removals
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const change of changes) {
    if (change.added) {
      linesAdded += change.value.split('\n').filter((l) => l.length > 0).length;
    } else if (change.removed) {
      linesRemoved += change.value.split('\n').filter((l) => l.length > 0).length;
    }
  }

  // Extract sections (markdown headers)
  const oldSections = extractSections(oldLines);
  const newSections = extractSections(newLines);

  // Compare sections
  const sectionsAdded = newSections.filter((s) => !oldSections.includes(s));
  const sectionsRemoved = oldSections.filter((s) => !newSections.includes(s));
  const sectionsChanged = findChangedSections(oldContent, newContent, oldSections, newSections);

  // Build summary
  const summaryParts: string[] = [];

  if (sectionsAdded.length > 0) {
    summaryParts.push(`Added ${sectionsAdded.length} section(s)`);
  }
  if (sectionsRemoved.length > 0) {
    summaryParts.push(`Removed ${sectionsRemoved.length} section(s)`);
  }
  if (sectionsChanged.length > 0) {
    summaryParts.push(`Updated ${sectionsChanged.length} section(s)`);
  }

  summaryParts.push(`+${linesAdded} -${linesRemoved} lines`);

  const summary = summaryParts.join(', ');

  return {
    sectionsAdded,
    sectionsRemoved,
    sectionsChanged,
    linesAdded,
    linesRemoved,
    summary,
  };
}

/**
 * Extract all markdown headers from content
 * Matches ## and ### level headers
 */
function extractSections(lines: string[]): string[] {
  const sections: string[] = [];

  for (const line of lines) {
    if (line.match(/^##\s+/) || line.match(/^###\s+/)) {
      // Extract header text (remove markdown syntax)
      const text = line.replace(/^#+\s+/, '').trim();
      if (text.length > 0) {
        sections.push(text);
      }
    }
  }

  return sections;
}

/**
 * Find sections that exist in both versions but have changed content
 * This is a heuristic: we check if section content differs
 */
function findChangedSections(
  oldContent: string,
  newContent: string,
  oldSections: string[],
  newSections: string[]
): string[] {
  const common = oldSections.filter((s) => newSections.includes(s));
  const changed: string[] = [];

  for (const section of common) {
    // Extract content for this section from both versions
    const oldSectionContent = extractSectionContent(oldContent, section);
    const newSectionContent = extractSectionContent(newContent, section);

    // If content differs, it's changed
    if (oldSectionContent !== newSectionContent) {
      changed.push(section);
    }
  }

  return changed;
}

/**
 * Extract the content of a specific section from markdown
 * Returns text from the header until the next header of same or higher level
 */
function extractSectionContent(content: string, sectionTitle: string): string {
  const lines = content.split('\n');
  let startIdx = -1;
  let endIdx = lines.length;

  // Find the section header
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(sectionTitle)) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    return '';
  }

  // Find the next header of same or higher level (## or ###)
  const headerMatch = lines[startIdx].match(/^(#+)\s+/);
  const headerLevel = headerMatch ? headerMatch[1].length : 0;

  for (let i = startIdx + 1; i < lines.length; i++) {
    const nextHeaderMatch = lines[i].match(/^(#+)\s+/);
    if (nextHeaderMatch) {
      const nextLevel = nextHeaderMatch[1].length;
      if (nextLevel <= headerLevel) {
        endIdx = i;
        break;
      }
    }
  }

  return lines.slice(startIdx, endIdx).join('\n');
}
