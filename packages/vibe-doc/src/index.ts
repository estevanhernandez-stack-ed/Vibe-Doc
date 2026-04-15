#!/usr/bin/env node

/**
 * Vibe Doc CLI
 * Main entry point for documentation generation pipeline
 */

import * as path from 'path';
import * as fs from 'fs';
import { Command } from 'commander';
import { logger } from './utils/logger';
import { scan } from './scanner';
import { readState, writeState, initState } from './state';
import { classify } from './classifier';
import { analyzeGaps } from './gap-analyzer';
import { generateDocument } from './generator';
import { RenderData, loadTemplate, listTemplates } from './templates';
import { checkForUpdates, downloadTemplate } from './templates/registry';
import { extractDataForDocType } from './generator/extractor';

const program = new Command();

const pkgJsonPath = path.resolve(__dirname, '..', 'package.json');
const pkgVersion = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')).version;

program
  .name('vibe-doc')
  .description('AI-powered documentation gap analyzer for any codebase')
  .version(pkgVersion);

/**
 * Scan command: Run artifact scanner and save inventory
 */
program
  .command('scan [projectPath]')
  .description('Scan a project and analyze its artifacts')
  .option(
    '-c, --confidence-threshold <number>',
    'Classification confidence threshold (0-1, default: 0.85)',
    '0.85'
  )
  .option(
    '--profile <path>',
    'Path to interview answers JSON file to populate project profile'
  )
  .action(async (projectPath: string, options: any) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();
    const confidenceThreshold = parseFloat(options.confidenceThreshold);

    try {
      logger.info('Starting vibe-doc scan', { projectPath: resolvedPath });

      // Initialize state
      let state = readState(resolvedPath) || initState();
      state.lastScan = new Date().toISOString();

      // Load interview answers from profile if provided
      if (options.profile) {
        try {
          const profilePath = path.resolve(options.profile);
          const profileContent = fs.readFileSync(profilePath, 'utf-8');
          const profileData = JSON.parse(profileContent);

          // Populate interviewAnswers with provided data, using defaults for missing fields
          state.projectProfile.interviewAnswers = {
            projectName: profileData.projectName || '',
            projectDescription: profileData.projectDescription || '',
            mainPurpose: profileData.mainPurpose || '',
            primaryUsers: profileData.primaryUsers || '',
            coreFeatures: profileData.coreFeatures || [],
            technologies: profileData.technologies || [],
            deploymentModel: profileData.deploymentModel || '',
            architectureStyle: profileData.architectureStyle || '',
          };

          // Set providedContext flag
          state.projectProfile.providedContext = 'profile';

          logger.info('Loaded interview answers from profile', { path: profilePath });
        } catch (error) {
          logger.warn('Failed to load profile file', { path: options.profile, error });
          // Continue without profile data - not a fatal error
        }
      }

      // Run scanner
      logger.info('Running artifact inventory scan...');
      state.artifactInventory = await scan(resolvedPath);

      // Run classifier
      logger.info('Running hybrid classification...');
      const classificationResult = classify(state.artifactInventory, { confidenceThreshold });

      if (classificationResult.resolved) {
        state.classification = classificationResult.classification!;
        logger.info('Classification complete', {
          category: state.classification.primaryCategory,
          confidence: state.classification.confidence,
        });
      } else {
        // Low confidence - use best candidate classification with LLM review available
        state.classification = classificationResult.classification!;
        logger.info('Low confidence classification, LLM prompt available', {
          category: state.classification.primaryCategory,
          confidence: state.classification.confidence,
        });
      }

      // Run gap analyzer
      logger.info('Running gap analyzer...');
      state.gapReport = analyzeGaps(state.classification, state.artifactInventory);

      // Save state
      writeState(resolvedPath, state);

      logger.info('Scan complete', {
        category: state.classification.primaryCategory,
        docsCovered: state.gapReport.summary.docsCovered,
        docsMissing: state.gapReport.summary.docsMissing,
        coverage: `${state.gapReport.summary.coveragePercent}%`,
      });

      // Output summary
      console.log('\n=== Vibe Doc Scan Complete ===\n');
      console.log(`Project: ${resolvedPath}`);
      console.log(`Category: ${state.classification.primaryCategory}`);
      console.log(`Confidence: ${(state.classification.confidence * 100).toFixed(0)}%`);
      console.log(`\nDocumentation Coverage: ${state.gapReport.summary.coveragePercent}%`);
      console.log(`  Covered: ${state.gapReport.summary.docsCovered}`);
      console.log(`  Partial: ${state.gapReport.summary.docsPartial}`);
      console.log(`  Missing: ${state.gapReport.summary.docsMissing}`);
      console.log(`\nState saved to: ${path.join(resolvedPath, '.vibe-doc', 'state.json')}\n`);
    } catch (error) {
      logger.error('Scan failed', { error });
      process.exit(1);
    }
  });

/**
 * Report command: Display gap analysis report
 */
program
  .command('report [projectPath]')
  .description('Display documentation gap report')
  .action((projectPath: string) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    try {
      const state = readState(resolvedPath);
      if (!state) {
        console.error(
          'No vibe-doc state found. Run "vibe-doc scan" first.'
        );
        process.exit(1);
      }

      console.log('\n=== Documentation Gap Report ===\n');
      console.log(`Category: ${state.classification.primaryCategory}`);
      console.log(`Confidence: ${(state.classification.confidence * 100).toFixed(0)}%`);
      console.log(`\nGaps by Tier:\n`);

      const byTier: Record<string, (typeof state.gapReport.gaps)[0][]> = {
        required: [],
        recommended: [],
        optional: [],
      };

      for (const gap of state.gapReport.gaps) {
        if (!byTier[gap.tier]) {
          byTier[gap.tier] = [];
        }
        byTier[gap.tier].push(gap);
      }

      for (const tier of ['required', 'recommended', 'optional']) {
        const gaps = byTier[tier];
        if (gaps.length > 0) {
          console.log(`${tier.toUpperCase()}:`);
          for (const gap of gaps) {
            const status = gap.found === 0 ? '❌' : gap.missing === 0 ? '✅' : '⚠️';
            console.log(`  ${status} ${gap.docType}`);
            console.log(`     ${gap.rationale}`);
          }
          console.log();
        }
      }

      console.log(`Coverage: ${state.gapReport.summary.coveragePercent}%\n`);
    } catch (error) {
      logger.error('Report failed', { error });
      process.exit(1);
    }
  });

/**
 * Status command: Check current state
 */
program
  .command('status [projectPath]')
  .description('Check vibe-doc status')
  .action((projectPath: string) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    try {
      const state = readState(resolvedPath);

      if (!state) {
        console.log('No vibe-doc state found. Run "vibe-doc scan" to initialize.');
        return;
      }

      console.log('\n=== Vibe Doc Status ===\n');
      console.log(`Last scan: ${new Date(state.lastScan).toLocaleString()}`);
      console.log(`Artifacts: ${state.artifactInventory.totalArtifacts}`);
      console.log(`Category: ${state.classification.primaryCategory}`);
      console.log(
        `Coverage: ${state.gapReport.summary.coveragePercent}% (${state.gapReport.summary.docsCovered} covered, ${state.gapReport.summary.docsMissing} missing)\n`
      );
    } catch (error) {
      logger.error('Status check failed', { error });
      process.exit(1);
    }
  });

/**
 * Confirm command: Mark classification as user-confirmed
 */
program
  .command('confirm [projectPath]')
  .description('Confirm the classification and mark as approved by user')
  .action((projectPath: string) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();

    try {
      const state = readState(resolvedPath);
      if (!state) {
        console.error('No vibe-doc state found. Run "vibe-doc scan" first.');
        process.exit(1);
      }

      state.classification.userConfirmed = true;
      writeState(resolvedPath, state);

      logger.info('Classification confirmed', {
        category: state.classification.primaryCategory,
      });

      console.log('\n=== Classification Confirmed ===\n');
      console.log(
        `Category "${state.classification.primaryCategory}" has been confirmed by user.\n`
      );
    } catch (error) {
      logger.error('Confirmation failed', { error });
      process.exit(1);
    }
  });

/**
 * Check command: CI-safe documentation check
 */
program
  .command('check [projectPath]')
  .description('CI-safe documentation check')
  .option('-t, --threshold <commits>', 'Staleness threshold in commits', '20')
  .action(async (projectPath: string, options: any) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();
    const threshold = parseInt(options.threshold, 10);

    try {
      const { runCheck } = await import('./checker');
      const result = await runCheck(resolvedPath, { threshold });

      console.log('\n=== Documentation Check ===\n');
      console.log(result.details);
      console.log();

      if (!result.pass) {
        process.exit(result.exitCode);
      }
    } catch (error) {
      logger.error('Check failed', { error });
      process.exit(1);
    }
  });

/**
 * Generate command: Generate a document from template
 */
program
  .command('generate <docType> [projectPath]')
  .description('Generate a document from template')
  .option('-f, --format <format>', 'Output format: md, docx, or both', 'both')
  .option('-a, --answers <answers.json>', 'Path to answers JSON file')
  .action(async (docType: string, projectPath: string, options: any) => {
    const resolvedPath = projectPath ? path.resolve(projectPath) : process.cwd();
    const format = options.format as 'md' | 'docx' | 'both';

    try {
      logger.info('Starting document generation', { docType, format });

      // Read state
      const state = readState(resolvedPath);
      if (!state) {
        console.error('No vibe-doc state found. Run "vibe-doc scan" first.');
        process.exit(1);
      }

      // Load answers if provided
      let userAnswers: Record<string, string> = {};
      if (options.answers) {
        const answersPath = path.resolve(options.answers);
        try {
          const content = fs.readFileSync(answersPath, 'utf-8');
          userAnswers = JSON.parse(content);
          logger.debug('Loaded user answers', { path: answersPath });
        } catch (error) {
          logger.warn('Failed to load answers file', { path: answersPath, error });
        }
      }

      // Extract data from artifacts
      const extractedData = extractDataForDocType(docType, state, resolvedPath);

      // Build render data
      const renderData: RenderData = {
        extracted: extractedData,
        user: userAnswers,
        metadata: {
          docType,
          generatedAt: new Date().toISOString(),
          classification: state.classification.primaryCategory,
          sourceArtifacts: state.artifactInventory.totalArtifacts,
        },
      };

      // Generate document
      const result = await generateDocument(docType, resolvedPath, state, renderData, format);

      // Save updated state
      writeState(resolvedPath, state);

      // Output summary
      console.log('\n=== Document Generated ===\n');
      console.log(`Document: ${docType}`);
      console.log(`Version: ${result.version}`);
      console.log(`Format(s): ${format}`);
      console.log(`\nGenerated files:`);
      for (const filePath of result.paths) {
        console.log(`  ${filePath}`);
      }
      console.log();
    } catch (error) {
      logger.error('Generation failed', { error });
      process.exit(1);
    }
  });

/**
 * Templates command group: Manage document templates
 */
const templatesCmd = program.command('templates').description('Manage document templates');

templatesCmd
  .command('list')
  .description('List all available document templates')
  .action(() => {
    try {
      const embeddedTemplates = listTemplates();
      const cacheDir = path.join(process.cwd(), '.vibe-doc');
      const cachedPath = path.join(cacheDir, 'templates');

      console.log('\n=== Available Templates ===\n');

      console.log('EMBEDDED (Built-in):');
      for (const template of embeddedTemplates) {
        console.log(`  • ${template}`);
      }

      // Check for cached remote templates
      if (fs.existsSync(cachedPath)) {
        const cachedFiles = fs.readdirSync(cachedPath).filter((f) => f.endsWith('.md'));
        const cachedTemplates = cachedFiles.map((f) => f.replace(/\.md$/, ''));
        const remoteOnly = cachedTemplates.filter((t) => !embeddedTemplates.includes(t));

        if (remoteOnly.length > 0) {
          console.log('\nREMOTE (Cached):');
          for (const template of remoteOnly) {
            console.log(`  • ${template}`);
          }
        }
      }
    } catch (error) {
      logger.error('Template list failed', { error });
      process.exit(1);
    }
  });

program.parse(process.argv);
