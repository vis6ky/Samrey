import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SecurityPolicy,
  AuthorizationLevel,
  ArchitecturePlanner,
  SelfCorrectionEngine,
  TraceLogger,
  WorkflowEngine
} from '../src/index.js';

describe('@samrey/ai-workflow', () => {
  describe('SecurityPolicy', () => {
    it('enforces authorization level hierarchy', () => {
      const policy = new SecurityPolicy(AuthorizationLevel.CODE_GENERATION);

      const readCheck = policy.checkPermission('read-docs', AuthorizationLevel.READ_ONLY);
      assert.equal(readCheck.allowed, true);

      const buildCheck = policy.checkPermission('run-build', AuthorizationLevel.BUILD_EXECUTION);
      assert.equal(buildCheck.allowed, false);
      assert.equal(buildCheck.requiresApproval, true);
    });

    it('requires human approval for sensitive destructive actions', () => {
      const policy = new SecurityPolicy(AuthorizationLevel.DEPLOYMENT);
      const deleteCheck = policy.checkPermission('delete-directory', AuthorizationLevel.DESTRUCTIVE_OPERATION);
      assert.equal(deleteCheck.allowed, false);
      assert.equal(deleteCheck.requiresApproval, true);
    });

    it('sanitizes API keys, secrets, and bearer tokens from output', () => {
      const policy = new SecurityPolicy();
      const raw = 'Failed with token: ghp_1234567890abcdefghijklmnopqrstuvwxyz and sk-proj1234567890abcdef1234 and Bearer secret_session_token';
      const sanitized = policy.sanitizeOutput(raw);
      assert.ok(!sanitized.includes('ghp_'));
      assert.ok(!sanitized.includes('sk-proj'));
      assert.ok(!sanitized.includes('secret_session_token'));
      assert.ok(sanitized.includes('[REDACTED_GITHUB_TOKEN]'));
      assert.ok(sanitized.includes('[REDACTED_OPENAI_KEY]'));
      assert.ok(sanitized.includes('[REDACTED_BEARER_TOKEN]'));
    });
  });

  describe('ArchitecturePlanner', () => {
    it('generates a complete Samrey SaaS application architecture plan', () => {
      const planner = new ArchitecturePlanner();
      const plan = planner.planApplication({
        appName: 'Acme SaaS',
        description: 'Customer management and metrics portal',
        features: ['user management', 'dashboard', 'analytics', 'auth']
      });

      assert.equal(plan.appName, 'Acme SaaS');
      assert.equal(plan.architecturePattern, 'Zero-VDOM Fine-Grained Reactive SPA');
      assert.ok(plan.componentHierarchy.length >= 3);
      assert.ok(plan.routing.length >= 3);
      assert.ok(plan.dataModels.length >= 2);
      assert.ok(plan.forms.length >= 2);
      assert.ok(plan.security.trustedTypesRequired);

      const dashboardComponent = plan.componentHierarchy.find(c => c.name === 'DashboardView');
      assert.ok(dashboardComponent);
      assert.ok(dashboardComponent.templateRefs.includes('metricsGrid'));
    });
  });

  describe('SelfCorrectionEngine', () => {
    it('diagnoses foreign React hooks and proposes native Samrey signals', () => {
      const engine = new SelfCorrectionEngine();
      const correction = engine.diagnoseFailure({
        stage: 'BUILD',
        errorMessage: 'TS2307: Cannot find module "react" or its corresponding type declarations. useState is not defined.'
      }, process.cwd());

      assert.ok(correction);
      assert.ok(correction.description.includes('React hooks'));
      assert.ok(correction.replacementSnippet.includes('@samrey/reactivity'));
      assert.ok(correction.ruleCitation.includes('REACTIVITY_RULES.md'));
    });

    it('diagnoses compiler error SAMREY-108 (<Show> tag in template)', () => {
      const engine = new SelfCorrectionEngine();
      const correction = engine.diagnoseFailure({
        stage: 'VALIDATE',
        errorMessage: 'SAMREY-108: Prohibited <Show> tag detected in static HTML template string.'
      }, process.cwd());

      assert.ok(correction);
      assert.ok(correction.replacementSnippet.includes('Show('));
      assert.ok(correction.ruleCitation.includes('COMPONENT_RULES.md'));
    });

    it('diagnoses in-place array mutation on signals (.value.push)', () => {
      const engine = new SelfCorrectionEngine();
      const correction = engine.diagnoseFailure({
        stage: 'TEST',
        errorMessage: 'Reactive assertion failed: todos.value.push did not trigger reactive subscribers.'
      }, process.cwd());

      assert.ok(correction);
      assert.ok(correction.description.includes('in-place array mutation'));
      assert.ok(correction.replacementSnippet.includes('.update'));
    });
  });

  describe('WorkflowEngine', () => {
    it('advances through workflow stages and maintains persistent state', async () => {
      const engine = new WorkflowEngine(
        'TASK-UNIT-TEST',
        'Unit Test Task',
        process.cwd(),
        'test-agent',
        'gemini-flash'
      );

      const disc = await engine.discover();
      assert.equal(disc.success, true);
      assert.ok(engine.getState().completedStages.includes('DISCOVER'));

      const plan = await engine.plan({
        appName: 'Test App',
        description: 'Test Application',
        features: ['dashboard']
      });
      assert.equal(plan.appName, 'Test App');
      assert.ok(engine.getState().completedStages.includes('PLAN'));

      const val = await engine.validate('const count = signal(0);', 'Counter.ts');
      assert.equal(val.valid, true);

      const invalidVal = await engine.validate('const [x, setX] = useState(0);', 'Broken.ts');
      assert.equal(invalidVal.valid, false);
      assert.ok(invalidVal.violations.length > 0);

      const report = engine.report();
      assert.equal(report.state.status, 'COMPLETED');
      assert.ok(report.trace.stepsCompleted.length >= 3);
    });
  });
});
