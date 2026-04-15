/**
 * Template Loader Module
 * Loads embedded templates with support for local cache overrides
 */

import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../utils/logger';

/**
 * Load a template by doc type
 * Checks for local cache override in .vibe-doc/templates/<docType>.md first,
 * falls back to embedded template
 */
export function loadTemplate(docType: string, cacheDir?: string): string {
  // Try local cache override first
  if (cacheDir) {
    const localCachePath = path.join(cacheDir, 'templates', `${docType}.md`);
    try {
      if (fs.existsSync(localCachePath)) {
        logger.debug('Loading template from local cache', { docType, path: localCachePath });
        return fs.readFileSync(localCachePath, 'utf-8');
      }
    } catch (error) {
      logger.warn('Failed to read local template cache', { docType, error: String(error) });
    }
  }

  // Fall back to embedded template
  const embeddedPath = getTemplatePath(docType);
  try {
    logger.debug('Loading embedded template', { docType, path: embeddedPath });
    return fs.readFileSync(embeddedPath, 'utf-8');
  } catch (error) {
    logger.error('Failed to load template', { docType, error: String(error) });
    throw new Error(`Template not found for doc type: ${docType}`);
  }
}

/**
 * Get path to the embedded template file
 */
export function getTemplatePath(docType: string): string {
  // __dirname is the dist directory at runtime
  // Look for templates in both src (dev) and dist (prod) locations
  let templatesDir = path.join(__dirname, 'templates', 'embedded');
  
  // In development, __dirname points to src/templates, so adjust
  if (!fs.existsSync(templatesDir)) {
    templatesDir = path.join(__dirname, '..', '..', 'src', 'templates', 'embedded');
  }

  return path.join(templatesDir, `${docType}.md`);
}

/**
 * List all available template names
 */
export function listTemplates(): string[] {
  const templates = [
    'adr',
    'runbook',
    'threat-model',
    'api-spec',
    'deployment-procedure',
    'test-plan',
    'data-model',
    'readme',
    'install-guide',
    'skill-command-reference',
    'changelog-contributing',
  ];

  return templates;
}

export { RenderData, renderTemplate } from './renderer';
