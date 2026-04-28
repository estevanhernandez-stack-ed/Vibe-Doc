/**
 * Documentation Matrix
 * Defines required documentation types per category x context
 */

import { logger } from '../utils/logger';

export enum DocType {
  ADR = 'adr',
  Runbook = 'runbook',
  ThreatModel = 'threat-model',
  APISpec = 'api-spec',
  DeploymentProcedure = 'deployment-procedure',
  TestPlan = 'test-plan',
  DataModel = 'data-model',
  README = 'readme',
  InstallGuide = 'install-guide',
  SkillCommandReference = 'skill-command-reference',
  ChangelogContributing = 'changelog-contributing',
}

export enum Tier {
  Required = 'required',
  Recommended = 'recommended',
  Optional = 'optional',
}

export interface DocRequirement {
  docType: DocType;
  tier: Tier;
  category: string;
  contexts: string[];
}

/**
 * Base tier assignments per category
 */
const BASE_MATRIX: Record<DocType, Record<string, Tier>> = {
  [DocType.ADR]: {
    WebApplication: Tier.Recommended,
    APIMicroservice: Tier.Recommended,
    DataPipeline: Tier.Recommended,
    InfrastructurePlatform: Tier.Recommended,
    MobileApplication: Tier.Recommended,
    AIMLSystem: Tier.Recommended,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Recommended,
  },
  [DocType.Runbook]: {
    WebApplication: Tier.Required,
    APIMicroservice: Tier.Required,
    DataPipeline: Tier.Required,
    InfrastructurePlatform: Tier.Required,
    MobileApplication: Tier.Required,
    AIMLSystem: Tier.Required,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Optional,
  },
  [DocType.ThreatModel]: {
    WebApplication: Tier.Recommended,
    APIMicroservice: Tier.Required,
    DataPipeline: Tier.Recommended,
    InfrastructurePlatform: Tier.Recommended,
    MobileApplication: Tier.Required,
    AIMLSystem: Tier.Required,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Recommended,
  },
  [DocType.APISpec]: {
    WebApplication: Tier.Required,
    APIMicroservice: Tier.Required,
    DataPipeline: Tier.Optional,
    InfrastructurePlatform: Tier.Optional,
    MobileApplication: Tier.Recommended,
    AIMLSystem: Tier.Recommended,
    IntegrationConnector: Tier.Required,
    ClaudeCodePlugin: Tier.Optional,
  },
  [DocType.DeploymentProcedure]: {
    WebApplication: Tier.Required,
    APIMicroservice: Tier.Required,
    DataPipeline: Tier.Required,
    InfrastructurePlatform: Tier.Required,
    MobileApplication: Tier.Required,
    AIMLSystem: Tier.Required,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Optional,
  },
  [DocType.TestPlan]: {
    WebApplication: Tier.Recommended,
    APIMicroservice: Tier.Recommended,
    DataPipeline: Tier.Required,
    InfrastructurePlatform: Tier.Recommended,
    MobileApplication: Tier.Required,
    AIMLSystem: Tier.Required,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Recommended,
  },
  [DocType.DataModel]: {
    WebApplication: Tier.Required,
    APIMicroservice: Tier.Recommended,
    DataPipeline: Tier.Required,
    InfrastructurePlatform: Tier.Optional,
    MobileApplication: Tier.Recommended,
    AIMLSystem: Tier.Required,
    IntegrationConnector: Tier.Optional,
    ClaudeCodePlugin: Tier.Optional,
  },
  [DocType.README]: {
    WebApplication: Tier.Required,
    APIMicroservice: Tier.Required,
    DataPipeline: Tier.Required,
    InfrastructurePlatform: Tier.Required,
    MobileApplication: Tier.Required,
    AIMLSystem: Tier.Required,
    IntegrationConnector: Tier.Required,
    ClaudeCodePlugin: Tier.Required,
  },
  [DocType.InstallGuide]: {
    WebApplication: Tier.Recommended,
    APIMicroservice: Tier.Recommended,
    DataPipeline: Tier.Recommended,
    InfrastructurePlatform: Tier.Required,
    MobileApplication: Tier.Required,
    AIMLSystem: Tier.Recommended,
    IntegrationConnector: Tier.Required,
    ClaudeCodePlugin: Tier.Required,
  },
  [DocType.SkillCommandReference]: {
    WebApplication: Tier.Optional,
    APIMicroservice: Tier.Optional,
    DataPipeline: Tier.Optional,
    InfrastructurePlatform: Tier.Optional,
    MobileApplication: Tier.Optional,
    AIMLSystem: Tier.Optional,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Required,
  },
  [DocType.ChangelogContributing]: {
    WebApplication: Tier.Recommended,
    APIMicroservice: Tier.Recommended,
    DataPipeline: Tier.Recommended,
    InfrastructurePlatform: Tier.Recommended,
    MobileApplication: Tier.Recommended,
    AIMLSystem: Tier.Recommended,
    IntegrationConnector: Tier.Recommended,
    ClaudeCodePlugin: Tier.Recommended,
  },
};

/**
 * Get required documentation types for a category and contexts
 */
export function getRequiredDocs(
  category: string,
  contexts: string[]
): DocRequirement[] {
  const requirements: DocRequirement[] = [];

  for (const docType of Object.values(DocType)) {
    let tier = BASE_MATRIX[docType][category] || Tier.Optional;

    // Apply context modifiers
    if (contexts.includes('Regulated')) {
      // Security-related docs to Required for regulated
      if (
        docType === DocType.ThreatModel ||
        docType === DocType.DeploymentProcedure ||
        docType === DocType.ADR
      ) {
        tier = Tier.Required;
      }
    }

    if (contexts.includes('CustomerFacing')) {
      // Customer-facing requires ops and quality docs
      if (
        docType === DocType.Runbook ||
        docType === DocType.APISpec ||
        docType === DocType.TestPlan
      ) {
        tier = Tier.Required;
      }
    }

    if (contexts.includes('MultiTenant')) {
      // MultiTenant requires security and data model docs
      if (docType === DocType.ThreatModel || docType === DocType.DataModel) {
        tier = Tier.Required;
      }
    }

    if (contexts.includes('PublicOpenSource')) {
      // Publicly distributed plugins create a malicious-fork attack surface:
      // anyone can plant prompt-injection in a SKILL.md and ride the
      // marketplace channel back to users. Threat-model AND runbook
      // (release / deprecation / malicious-version response) become Required
      // regardless of category baseline.
      if (docType === DocType.ThreatModel || docType === DocType.Runbook) {
        tier = Tier.Required;
      }
    }

    if (contexts.includes('AggregatedMarketplace')) {
      // For aggregated marketplaces (marketplace.json with multiple plugins[]
      // entries), marketplace.json IS the api-spec — the structural contract
      // between marketplace host and plugin consumers. Elevates api-spec
      // from Optional → Required so a missing/malformed manifest is flagged
      // as a deployment blocker.
      if (docType === DocType.APISpec) {
        tier = Tier.Required;
      }
    }

    requirements.push({
      docType,
      tier,
      category,
      contexts,
    });
  }

  logger.info('Required docs retrieved', {
    category,
    contextCount: contexts.length,
    docCount: requirements.length,
  });

  return requirements;
}
