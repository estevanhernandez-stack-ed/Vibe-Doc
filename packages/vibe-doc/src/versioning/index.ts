/**
 * Version Tracking and History Management
 * Handles archiving and tracking documentation versions
 */

import * as path from 'path';
import * as fs from 'fs';
import { VibedocState, HistoryEntry } from '../state/schema';

const HISTORY_DIR = '.history';

/**
 * Archive the current version of a generated doc
 * Moves it to docs/generated/.history/<docType>-v<N>-<date>.md
 * @param projectPath - Root path of the project
 * @param docType - Type of document to archive
 * @param state - Current vibe-doc state
 * @returns HistoryEntry if archived, null if no current version exists
 */
export function archiveCurrentVersion(
  projectPath: string,
  docType: string,
  state: VibedocState
): HistoryEntry | null {
  const docsDir = path.join(projectPath, 'docs', 'generated');
  const currentPath = path.join(docsDir, `${docType}.md`);

  // Check if current version exists
  if (!fs.existsSync(currentPath)) {
    return null;
  }

  // Create .history directory if needed
  const historyDir = path.join(docsDir, HISTORY_DIR);
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  // Get next version number
  const nextVersion = getNextVersion(state, docType);

  // Generate archive filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const archiveFilename = `${docType}-v${nextVersion}-${dateStr}.md`;
  const archivePath = path.join(historyDir, archiveFilename);

  // Move current to archive
  fs.renameSync(currentPath, archivePath);

  // Create history entry
  const historyEntry: HistoryEntry = {
    docType,
    version: `v${nextVersion}`,
    generatedAt: new Date().toISOString(),
    path: path.relative(projectPath, archivePath),
  };

  return historyEntry;
}

/**
 * Get version history for a specific doc type
 * @param state - Current vibe-doc state
 * @param docType - Type of document
 * @returns Array of HistoryEntry for this doc type, sorted by version descending
 */
export function getVersionHistory(
  state: VibedocState,
  docType: string
): HistoryEntry[] {
  return state.history
    .filter((entry) => entry.docType === docType)
    .sort((a, b) => {
      // Extract version numbers: "v1", "v2", etc.
      const aNum = parseInt(a.version.replace('v', ''), 10);
      const bNum = parseInt(b.version.replace('v', ''), 10);
      return bNum - aNum; // Descending
    });
}

/**
 * Get the next version number for a doc type
 * @param state - Current vibe-doc state
 * @param docType - Type of document
 * @returns Next version number (count + 1)
 */
export function getNextVersion(state: VibedocState, docType: string): number {
  const history = getVersionHistory(state, docType);
  if (history.length === 0) {
    return 1;
  }
  // Extract the highest version number and increment
  const highestVersion = parseInt(history[0].version.replace('v', ''), 10);
  return highestVersion + 1;
}

/**
 * Get the full path to a versioned document
 * @param projectPath - Root path of the project
 * @param docType - Type of document
 * @param version - Version number (e.g., "v1", "v2")
 * @returns Full path to the versioned document, or null if not found
 */
export function getVersionedPath(
  projectPath: string,
  docType: string,
  version: string
): string | null {
  const historyDir = path.join(projectPath, 'docs', 'generated', HISTORY_DIR);

  if (!fs.existsSync(historyDir)) {
    return null;
  }

  // Look for files matching pattern: <docType>-<version>-*.md
  const files = fs.readdirSync(historyDir);
  const versionedFile = files.find((f) => f.startsWith(`${docType}-${version}-`) && f.endsWith('.md'));

  if (!versionedFile) {
    return null;
  }

  return path.join(historyDir, versionedFile);
}

/**
 * List all available versions for a doc type on disk
 * @param projectPath - Root path of the project
 * @param docType - Type of document
 * @returns Array of version strings (e.g., ["v2", "v1"])
 */
export function listAvailableVersions(projectPath: string, docType: string): string[] {
  const historyDir = path.join(projectPath, 'docs', 'generated', HISTORY_DIR);

  if (!fs.existsSync(historyDir)) {
    return [];
  }

  const files = fs.readdirSync(historyDir);
  const versions = new Set<string>();

  for (const file of files) {
    if (file.startsWith(`${docType}-v`) && file.endsWith('.md')) {
      // Extract version from filename: <docType>-v<N>-<date>.md
      const match = file.match(new RegExp(`^${docType}-(v\\d+)-`));
      if (match) {
        versions.add(match[1]);
      }
    }
  }

  // Sort descending
  return Array.from(versions).sort((a, b) => {
    const aNum = parseInt(a.replace('v', ''), 10);
    const bNum = parseInt(b.replace('v', ''), 10);
    return bNum - aNum;
  });
}
