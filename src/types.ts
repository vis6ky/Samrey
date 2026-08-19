export type CategoryCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface CategoryInfo {
  code: CategoryCode;
  label: string;
  badgeColor: string;
  description: string;
}

export interface DimensionItem {
  id: string;
  dimension: string;
  react: { summary: string; category?: CategoryCode; details: string };
  angular: { summary: string; category?: CategoryCode; details: string };
  vue: { summary: string; category?: CategoryCode; details: string };
  svelte: { summary: string; category?: CategoryCode; details: string };
  solid: { summary: string; category?: CategoryCode; details: string };
  aether: { summary: string; architecturalSolution: string };
}

export interface FrameworkPackage {
  name: string;
  scope: string;
  description: string;
  bundleBudget: string;
  dependencies: string[];
  keyExports: string[];
  responsibilities: string[];
  securityBoundary: string;
}

export interface ADR {
  id: string;
  title: string;
  status: 'Accepted' | 'Proposed' | 'Superseded';
  category: string;
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  alternatives: string[];
}

export interface SecurityThreat {
  id: string;
  title: string;
  category: string;
  samplePayload: string;
  vulnDescription: string;
  frameworkImpact: string;
  aetherDefense: string;
  aetherCodeSnippet: string;
}

export interface RoadmapPhase {
  phaseNumber: number;
  name: string;
  duration: string;
  status: 'Completed' | 'Ready to Start' | 'Planned' | 'Deferred';
  objectives: string[];
  verificationGate: string[];
  deliverablePackages: string[];
}

export interface DeferredFeature {
  feature: string;
  reason: string;
  alternative: string;
}
