import { test, describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Review Item 4: Documentation Version Alignment & 1.x -> 2.x Upgrade Guide', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('1. docs/UPGRADE_GUIDE.md is rewritten for 1.x -> 2.x with CHANGELOG migration items and zero 1.0.0-rc.1 references', () => {
    const upgradeGuidePath = path.join(rootDir, 'docs', 'UPGRADE_GUIDE.md');
    const content = fs.readFileSync(upgradeGuidePath, 'utf8');

    // Must not contain any 1.0.0-rc.1 references or instructions
    assert.ok(!content.includes('1.0.0-rc.1'), 'UPGRADE_GUIDE.md must not contain 1.0.0-rc.1');
    assert.ok(!content.includes('^1.0.0-rc.1'), 'UPGRADE_GUIDE.md must not contain ^1.0.0-rc.1');

    // Must target 2.0.0 / 2.x
    assert.ok(content.includes('2.0.0') || content.includes('2.x'), 'UPGRADE_GUIDE.md must target 2.0.0 or 2.x');
    assert.ok(content.includes('^2.0.0'), 'UPGRADE_GUIDE.md package dependency block must recommend ^2.0.0');

    // Must cover key breaking changes from CHANGELOG.md Migration from 1.0.x
    const requiredTopics = [
      './dist', // Restricted entry points / deep imports
      'initDevTools', // Explicit DevTools initialization
      'HTMLAnchorElement', // Link primitive returns real HTMLAnchorElement
      'SAMREY-108', // Compiler rejects control flow tags
      'samrey audit', // CLI real tasks & truthful exit codes
      'onError', // Error boundary handling & non-throwing signal writes
      'sanitizeUri', // Sanitization hardening
      'TypeScript-Native', // Zero JSX starters
      'samrey create', // Scaffolding directory isolation
      'bindField', // Form field bidirectional binding
      'guard' // Router guards & teardown
    ];

    for (const topic of requiredTopics) {
      assert.ok(
        content.includes(topic),
        `UPGRADE_GUIDE.md must document breaking change / migration item regarding "${topic}"`
      );
    }
  });

  it('2. docs/ARCHITECTURE.md and docContents.ts no longer contain "1.0.0-Draft"', () => {
    const archPath = path.join(rootDir, 'docs', 'ARCHITECTURE.md');
    const archContent = fs.readFileSync(archPath, 'utf8');
    assert.ok(!archContent.includes('1.0.0-Draft'), 'docs/ARCHITECTURE.md must not contain "1.0.0-Draft"');
    assert.ok(archContent.includes('2.0.0'), 'docs/ARCHITECTURE.md should reflect version 2.0.0');

    const docContentsPath = path.join(rootDir, 'src', 'data', 'docContents.ts');
    if (fs.existsSync(docContentsPath)) {
      const docContents = fs.readFileSync(docContentsPath, 'utf8');
      assert.ok(!docContents.includes('1.0.0-Draft'), 'src/data/docContents.ts must not contain "1.0.0-Draft"');
      assert.ok(docContents.includes('2.0.0'), 'src/data/docContents.ts should reflect version 2.0.0');
    }
  });

  it('3. User-facing documentation files do not contain 1.0.0-rc.1 or obsolete version headers', () => {
    const userFacingDocs = [
      'docs/GETTING_STARTED.md',
      'docs/INSTALLATION.md',
      'docs/COMPATIBILITY.md',
      'docs/LIMITATIONS.md',
      'docs/ERROR_CODES.md',
      'docs/SECURITY.md',
      'docs/TROUBLESHOOTING.md',
      'docs/PUBLIC_API.md',
      'docs/RELEASE.md',
      'docs/NPM_PUBLICATION_GUIDE.md',
      'examples/project-manager/README.md',
      'examples/project-manager/src/components/Sidebar.ts',
      '.github/ISSUE_TEMPLATE/bug_report.md'
    ];

    for (const relPath of userFacingDocs) {
      const fullPath = path.join(rootDir, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, 'utf8');
      assert.ok(!content.includes('1.0.0-rc.1'), `${relPath} must not contain "1.0.0-rc.1"`);
      assert.ok(!content.includes('1.0.0-Draft'), `${relPath} must not contain "1.0.0-Draft"`);
    }
  });

  it('4. Historical audit documents retaining 1.0.0-rc.1 are clearly labeled as historical or audit records', () => {
    const auditDocs = [
      'docs/DEPENDENCY_INDEPENDENCE_AUDIT.md',
      'docs/FINAL_RELEASE_CANDIDATE_AUDIT.md',
      'docs/FINAL_RELEASE_CHECKLIST.md',
      'docs/RELEASE_CANDIDATE_AUDIT.md',
      'docs/RELEASE_CHECKLIST.md',
      'docs/POST_RELEASE_VALIDATION.md'
    ];

    for (const relPath of auditDocs) {
      const fullPath = path.join(rootDir, relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      const isClearlyLabeled =
        content.includes('Historical Record') ||
        content.includes('Audit Report') ||
        content.includes('Hostile Audit') ||
        content.includes('Release Candidate 1.0.0 Audit') ||
        content.includes('v1.0.0-rc.1 — Final Release Checklist');
      assert.ok(isClearlyLabeled, `${relPath} must be clearly labeled as an audit or historical report`);
    }
  });

  it('5. docs/release/FINAL_RELEASE_CHECKLIST.md catches obsolete "^1.0.0: PASS" and requires 2.0.0 update or historical record label', () => {
    const checklistPath = path.join(rootDir, 'docs', 'release', 'FINAL_RELEASE_CHECKLIST.md');
    const content = fs.readFileSync(checklistPath, 'utf8');

    const isHistorical = content.includes('Historical Record') || content.includes('Historical Archive');
    const isUpdatedTo2 = content.includes('2.0.0') && content.includes('^2.0.0');

    // Must be updated for 2.0.0 or marked as a historical record
    assert.ok(
      isHistorical || isUpdatedTo2,
      'docs/release/FINAL_RELEASE_CHECKLIST.md must be updated for 2.0.0 or clearly marked as a historical record'
    );

    // If not marked as a historical record, it must not claim dependency references are pinned to ^1.0.0
    if (!isHistorical) {
      assert.ok(
        !content.includes('pinned to `^1.0.0`: **PASS**') && !content.includes('pinned to ^1.0.0: PASS'),
        'docs/release/FINAL_RELEASE_CHECKLIST.md still claims dependency references are "pinned to ^1.0.0: PASS"'
      );
    }
  });
});
