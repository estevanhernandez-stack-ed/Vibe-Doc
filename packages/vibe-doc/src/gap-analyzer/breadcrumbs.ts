/**
 * Breadcrumbs Module
 * Search heuristics for finding evidence of documentation in artifacts
 */

import { logger } from '../utils/logger';

export interface Breadcrumb {
  docType: string;
  keywords: string[];
  filePatterns: string[];
  gitPatterns: string[];
  codePatterns: string[];
  requiredSections: string[];
  gapQuestions: string[];
}

/**
 * Get breadcrumbs for a specific doc type
 */
export function getBreadcrumbs(docType: string): Breadcrumb {
  const breadcrumbs: Record<string, Breadcrumb> = {
    adr: {
      docType: 'adr',
      keywords: [
        'decision',
        'architecture',
        'trade-off',
        'rationale',
        'consequence',
        'alternative',
        'context',
        'status',
      ],
      filePatterns: ['**/docs/adr/**', '**/adr/**', '**/decisions/**', '**/ADR*.md'],
      gitPatterns: ['adr:', 'arch:', 'decision:'],
      codePatterns: ['ADR', 'architecture decision', 'trade-off', 'rationale'],
      requiredSections: [
        'status',
        'context',
        'decision',
        'consequences',
        'alternatives',
      ],
      gapQuestions: [
        'What major architectural decisions have you made?',
        'What trade-offs did you consider and reject?',
        'What were the alternatives to your current architecture?',
      ],
    },

    runbook: {
      docType: 'runbook',
      keywords: [
        'restart',
        'rollback',
        'deploy',
        'monitor',
        'health check',
        'incident',
        'on-call',
        'procedure',
        'emergency',
        'escalation',
      ],
      filePatterns: [
        '**/docs/runbooks/**',
        '**/runbook/**',
        '**/ops/**',
        '**/RUNBOOK*.md',
      ],
      gitPatterns: ['fix:', 'hotfix:', 'revert:', 'ops:'],
      codePatterns: [
        'healthCheck',
        'gracefulShutdown',
        'process.exit',
        'retry',
        'circuitBreaker',
        'liveness',
      ],
      requiredSections: [
        'service-overview',
        'startup-procedure',
        'health-checks',
        'common-issues',
        'rollback-procedure',
        'escalation-path',
      ],
      gapQuestions: [
        'What is the process for restarting the service?',
        'Who gets paged when something breaks?',
        'What is your rollback procedure?',
        'What are the most common issues and fixes?',
      ],
    },

    'threat-model': {
      docType: 'threat-model',
      keywords: [
        'threat',
        'risk',
        'vulnerability',
        'attack',
        'security',
        'mitigation',
        'trust boundary',
        'adversary',
        'exploit',
      ],
      filePatterns: ['**/docs/security/**', '**/threat/**', '**/THREAT*.md'],
      gitPatterns: ['security:', 'vuln:', 'risk:'],
      codePatterns: [
        'authenticate',
        'authorize',
        'encrypt',
        'sanitize',
        'validate',
        'csrf',
        'xss',
      ],
      requiredSections: [
        'asset-scope',
        'threat-actors',
        'threat-scenarios',
        'mitigations',
        'residual-risks',
      ],
      gapQuestions: [
        'What are your most valuable assets that need protection?',
        'What types of attacks are you most concerned about?',
        'How do you authenticate users and services?',
        'What encryption and secrets management do you use?',
      ],
    },

    'api-spec': {
      docType: 'api-spec',
      keywords: [
        'endpoint',
        'request',
        'response',
        'parameter',
        'authentication',
        'error',
        'status code',
        'schema',
      ],
      filePatterns: [
        '**/swagger.json',
        '**/openapi.yaml',
        '**/docs/api/**',
        '**/API*.md',
      ],
      gitPatterns: ['api:', 'endpoint:'],
      codePatterns: [
        '@route',
        '@get',
        '@post',
        '@put',
        '@delete',
        'router.get',
        'app.post',
      ],
      requiredSections: [
        'base-url',
        'endpoints',
        'request-format',
        'response-format',
        'error-handling',
        'authentication',
      ],
      gapQuestions: [
        'What are your primary API endpoints?',
        'What request/response formats do you use?',
        'How do you handle authentication and authorization?',
        'What error codes and messages do you return?',
      ],
    },

    'deployment-procedure': {
      docType: 'deployment-procedure',
      keywords: [
        'deploy',
        'release',
        'build',
        'pipeline',
        'ci/cd',
        'environment',
        'staging',
        'production',
        'rollback',
      ],
      filePatterns: [
        '**/.github/workflows/**',
        '**/deploy/**',
        '**/docs/deployment/**',
        '**/DEPLOY*.md',
      ],
      gitPatterns: ['deploy:', 'release:', 'ci:'],
      codePatterns: [
        'docker build',
        'kubectl apply',
        'terraform apply',
        'database migration',
      ],
      requiredSections: [
        'prerequisites',
        'build-process',
        'environment-setup',
        'testing-before-deploy',
        'deployment-steps',
        'post-deployment-checks',
        'rollback-procedure',
      ],
      gapQuestions: [
        'What is your build process?',
        'How do you deploy to different environments?',
        'What tests run before deployment?',
        'How do you handle database migrations?',
        'What is your rollback procedure?',
      ],
    },

    'test-plan': {
      docType: 'test-plan',
      keywords: [
        'test',
        'unit',
        'integration',
        'e2e',
        'coverage',
        'quality',
        'testing strategy',
        'acceptance criteria',
      ],
      filePatterns: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/test/**',
        '**/tests/**',
        '**/TEST*.md',
      ],
      gitPatterns: ['test:', 'fix:', 'test-fix:'],
      codePatterns: [
        'describe',
        'it(',
        'test(',
        'expect',
        'assert',
        'mock',
        'stub',
      ],
      requiredSections: [
        'test-strategy',
        'unit-tests',
        'integration-tests',
        'e2e-tests',
        'performance-tests',
        'coverage-targets',
      ],
      gapQuestions: [
        'What is your testing strategy?',
        'What is your code coverage target?',
        'What critical paths do you test end-to-end?',
        'How do you test performance?',
        'How do you test third-party integrations?',
      ],
    },

    'data-model': {
      docType: 'data-model',
      keywords: [
        'schema',
        'table',
        'column',
        'entity',
        'relationship',
        'constraint',
        'index',
        'type',
        'field',
      ],
      filePatterns: [
        '**/migrations/**',
        '**/schema/**',
        '**/models/**',
        '**/DATA*.md',
      ],
      gitPatterns: ['schema:', 'model:', 'migrate:'],
      codePatterns: [
        'CREATE TABLE',
        'ALTER TABLE',
        'interface',
        'type',
        '@entity',
        '@model',
      ],
      requiredSections: [
        'entity-overview',
        'table-schemas',
        'relationships',
        'constraints',
        'indexes',
        'migration-strategy',
      ],
      gapQuestions: [
        'What are your main entities/tables?',
        'What are the relationships between them?',
        'What constraints and validation rules exist?',
        'How do you handle schema migrations?',
        'What indexing strategy do you use?',
      ],
    },
  };

  const breadcrumb = breadcrumbs[docType];
  if (!breadcrumb) {
    logger.warn('Unknown doc type for breadcrumbs', { docType });
    return {
      docType,
      keywords: [],
      filePatterns: [],
      gitPatterns: [],
      codePatterns: [],
      requiredSections: [],
      gapQuestions: [],
    };
  }

  return breadcrumb;
}
