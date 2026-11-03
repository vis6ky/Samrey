import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  samreyDevToolsBridge, 
  defaultGraphInspector,
  defaultComponentInspector,
  defaultOwnerInspector,
  defaultRouterInspector,
  defaultNetworkInspector,
  defaultFormInspector,
  defaultPerformanceInspector,
  sanitizePayload,
  isSensitiveKey,
  DevToolsEvent,
  initDevtools,
  getGraphSnapshot
} from '../src/index.js';

describe('@samrey/devtools - Extended Inspection Suite', () => {
  it('strictly redacts sensitive keys, tokens, and passwords in payloads', () => {
    assert.equal(isSensitiveKey('password'), true);
    assert.equal(isSensitiveKey('authToken'), true);
    assert.equal(isSensitiveKey('apiKey'), true);
    assert.equal(isSensitiveKey('userName'), false);

    const rawPayload = {
      username: 'alex',
      password: 'SuperSecretPassword123!',
      nested: {
        api_key: 'sk_live_1234567890',
        bearerToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        data: 'normal value'
      }
    };

    const sanitized: any = sanitizePayload(rawPayload);
    assert.equal(sanitized.username, 'alex');
    assert.equal(sanitized.password, '[REDACTED]');
    assert.equal(sanitized.nested.api_key, '[REDACTED]');
    assert.equal(sanitized.nested.data, 'normal value');
  });

  it('redacts JWT strings and Bearer authorization tokens even in generic fields', () => {
    const payload = {
      header: 'Bearer secret_access_token_xyz',
      jwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    };

    const sanitized: any = sanitizePayload(payload);
    assert.equal(sanitized.header, 'Bearer [REDACTED]');
    assert.equal(sanitized.jwt, '[REDACTED JWT]');
  });

  it('inspects component trees and maintains parent-child relationships', () => {
    defaultComponentInspector.clear();

    defaultComponentInspector.registerComponent({
      id: 'comp-root',
      name: 'App',
      props: { title: 'Dashboard' }
    });

    defaultComponentInspector.registerComponent({
      id: 'comp-child-1',
      name: 'Header',
      parentId: 'comp-root',
      props: { sticky: true }
    });

    defaultComponentInspector.registerComponent({
      id: 'comp-child-2',
      name: 'UserProfile',
      parentId: 'comp-root',
      props: { password: 'secret_user_pwd', email: 'user@example.com' }
    });

    const root = defaultComponentInspector.getComponent('comp-root');
    assert.ok(root !== undefined);
    assert.equal(root.childrenIds.length, 2);

    const userProfile = defaultComponentInspector.getComponent('comp-child-2');
    assert.ok(userProfile !== undefined);
    assert.equal(userProfile.props.password, '[REDACTED]');
    assert.equal(userProfile.props.email, 'user@example.com');

    // Unmount
    defaultComponentInspector.unmountComponent('comp-child-1');
    assert.equal(root.childrenIds.length, 1);
  });

  it('inspects owners and effect execution lifecycle', () => {
    defaultOwnerInspector.clear();

    defaultOwnerInspector.registerOwner('owner-1');
    defaultOwnerInspector.recordEffectRun('effect-1', 'owner-1', 1.25, 'titleSync');

    const owners = defaultOwnerInspector.getOwners();
    assert.equal(owners.length, 1);
    assert.equal(owners[0]?.effectsCount, 1);

    const effects = defaultOwnerInspector.getEffects();
    assert.equal(effects.length, 1);
    assert.equal(effects[0]?.runCount, 1);
    assert.equal(effects[0]?.name, 'titleSync');

    defaultOwnerInspector.disposeOwner('owner-1');
    assert.equal(owners[0]?.disposed, true);
  });

  it('inspects router navigation history and current state', () => {
    defaultRouterInspector.clear();

    defaultRouterInspector.recordNavigation('/dashboard', { tab: 'overview' }, { filter: 'active' }, 'Dashboard Overview');
    defaultRouterInspector.recordNavigation('/settings', {}, { token: 'secret_session_token' }, 'Settings');

    const current = defaultRouterInspector.getCurrentRoute();
    assert.ok(current !== null);
    assert.equal(current?.path, '/settings');
    assert.equal((current?.query as any)?.token, '[REDACTED]');

    const history = defaultRouterInspector.getNavigationHistory();
    assert.equal(history.length, 2);
  });

  it('inspects network requests and redacts authorization headers', () => {
    defaultNetworkInspector.clear();

    defaultNetworkInspector.recordRequest('req-1', 'POST', '/api/v1/auth/login?access_token=SECRET123&client_id=myApp', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer super_secret_token_123'
    }, { password: 'rawPassword123' });

    defaultNetworkInspector.recordResponse('req-1', 200, 'OK', { status: 'success', token: 'jwt_response_token' });

    const requests = defaultNetworkInspector.getRequests();
    assert.equal(requests.length, 1);
    const req = requests[0]!;
    assert.ok(req.url.includes('access_token=%5BREDACTED%5D') || req.url.includes('access_token=[REDACTED]'));
    assert.ok(!req.url.includes('SECRET123'));
    assert.equal(req.headers?.Authorization, '[REDACTED]');
    assert.equal((req.body as any)?.password, '[REDACTED]');
    assert.equal((req.responseBody as any)?.token, '[REDACTED]');
    assert.equal(req.status, 200);
  });

  it('exports initDevtools and getGraphSnapshot', () => {
    assert.equal(typeof initDevtools, 'function');
    assert.equal(typeof getGraphSnapshot, 'function');
    assert.ok(Array.isArray(getGraphSnapshot()));
  });

  it('inspects form validation and field states', () => {
    defaultFormInspector.clear();

    defaultFormInspector.recordFormState('signupForm', {
      valid: false,
      dirty: true,
      submitting: false,
      submitCount: 1,
      fields: {
        email: { name: 'email', value: 'invalid-email', touched: true, dirty: true, valid: false, errors: ['Invalid email format'] },
        password: { name: 'password', value: 'myPassword!', touched: true, dirty: true, valid: true, errors: [] }
      }
    });

    const form = defaultFormInspector.getForm('signupForm');
    assert.ok(form !== undefined);
    assert.equal(form?.valid, false);
    assert.equal(form?.fields.password.value, '[REDACTED]');
    assert.equal(form?.fields.email.value, 'invalid-email');
  });

  it('measures and aggregates performance metrics', () => {
    defaultPerformanceInspector.clear();

    defaultPerformanceInspector.recordMetric('App.render', 4.5, 'render');
    defaultPerformanceInspector.recordMetric('List.render', 8.5, 'render');
    defaultPerformanceInspector.recordMetric('Network.fetch', 45.0, 'network');

    const renderMetrics = defaultPerformanceInspector.getMetrics('render');
    assert.equal(renderMetrics.length, 2);

    const avgRender = defaultPerformanceInspector.getAverageDuration('render');
    assert.equal(avgRender, 6.5);
  });
});
