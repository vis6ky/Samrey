# Gati Framework — Release Rollback & Emergency Incident Protocol

**Target Version:** 1.0.0  
**License:** Apache-2.0  

## 1. Registry Immutability & Rollback Constraints

NPM packages are immutable once published. NPM's unpublish policy strictly forbids unpublishing packages after 72 hours or if other packages depend on them.

Therefore, rollback follows the standard industry release channel protocol:

## 2. Rollback Actions by Scenario

### Scenario A: Incorrect Dist-Tag
Fix by repointing the dist-tag immediately:
```bash
npm dist-tag add @gati/cli@0.9.0 latest
npm dist-tag add @gati/runtime@0.9.0 latest
```

### Scenario B: Critical Bug in Production Release (`1.0.0`)
1. Increment version to `1.0.1`, patch the issue, and publish to the `latest` channel.
2. If necessary, deprecate the affected package version:
```bash
npm deprecate @gati/runtime@1.0.0 "Critical patch in 1.0.1, please update"
```

### Scenario C: Partial Publication Interruption
If a network failure occurs during multi-package publish:
1. Identify missing packages using `npm run release:verify`.
2. Resume publication for unpublished packages with `npm publish --access public --tag latest`.
