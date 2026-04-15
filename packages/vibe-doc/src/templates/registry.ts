/**
 * Remote Template Registry Module
 * Handles checking for and downloading remote template updates
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Result of checking for template updates
 */
export interface UpdateResult {
  hasUpdates: boolean;
  availableUpdates: TemplateUpdate[];
  timestamp: string;
}

/**
 * Information about an available template update
 */
export interface TemplateUpdate {
  docType: string;
  url: string;
  hash: string;
  version: string;
}

/**
 * Manifest of available templates from remote source
 */
interface RemoteManifest {
  templates: Array<{
    docType: string;
    url: string;
    hash: string;
    version: string;
  }>;
  timestamp: string;
}

/**
 * Check for template updates by fetching the manifest
 * Falls back gracefully when offline
 */
export async function checkForUpdates(
  manifestUrl: string,
  cacheDir: string,
): Promise<UpdateResult> {
  try {
    logger.debug('Checking for template updates', { manifestUrl });

    const manifest = await fetchManifest(manifestUrl);
    const updates = await compareWithCache(manifest.templates, cacheDir);

    return {
      hasUpdates: updates.length > 0,
      availableUpdates: updates,
      timestamp: manifest.timestamp,
    };
  } catch (error) {
    logger.warn('Failed to check for updates, using cached templates', {
      error: String(error),
    });

    return {
      hasUpdates: false,
      availableUpdates: [],
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Download a template and cache it
 */
export async function downloadTemplate(
  docType: string,
  url: string,
  cacheDir: string,
): Promise<void> {
  try {
    logger.debug('Downloading template', { docType, url });

    const content = await fetchTemplate(url);
    const templatesDir = path.join(cacheDir, 'templates');

    // Ensure templates directory exists
    fs.mkdirSync(templatesDir, { recursive: true });

    const cachePath = path.join(templatesDir, `${docType}.md`);
    fs.writeFileSync(cachePath, content, 'utf-8');

    logger.info('Template downloaded and cached', { docType, path: cachePath });
  } catch (error) {
    logger.error('Failed to download template', { docType, error: String(error) });
    throw new Error(`Failed to download template for ${docType}: ${String(error)}`);
  }
}

/**
 * Fetch a manifest from a remote URL with timeout
 */
async function fetchManifest(manifestUrl: string): Promise<RemoteManifest> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(manifestUrl, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as RemoteManifest;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch template content from a remote URL with timeout
 */
async function fetchTemplate(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Compare remote templates with cached versions
 * Returns list of templates with updates available
 */
async function compareWithCache(
  remoteTemplates: RemoteManifest['templates'],
  cacheDir: string,
): Promise<TemplateUpdate[]> {
  const updates: TemplateUpdate[] = [];

  for (const remoteTemplate of remoteTemplates) {
    const cachePath = path.join(cacheDir, 'templates', `${remoteTemplate.docType}.md`);

    // Check if cached version exists
    if (!fs.existsSync(cachePath)) {
      updates.push({
        docType: remoteTemplate.docType,
        url: remoteTemplate.url,
        hash: remoteTemplate.hash,
        version: remoteTemplate.version,
      });
      continue;
    }

    // Compare hashes
    const cachedContent = fs.readFileSync(cachePath, 'utf-8');
    const cachedHash = hashContent(cachedContent);

    if (cachedHash !== remoteTemplate.hash) {
      updates.push({
        docType: remoteTemplate.docType,
        url: remoteTemplate.url,
        hash: remoteTemplate.hash,
        version: remoteTemplate.version,
      });
    }
  }

  return updates;
}

/**
 * Simple hash function for content comparison
 * Not for security, just for change detection
 */
function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}
