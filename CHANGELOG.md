# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.0.0] - 2026-04-29

### Breaking Changes
- **Requires Homebridge 2.0** (>=2.0.0-beta.0). Users on Homebridge 1.x must stay on plugin v1.x.
- **Requires Node.js 22 or 24** (matching Homebridge 2.0's engine requirements).

### Changed
- Converted plugin from CommonJS to ESM (`"type": "module"` in package.json).
- Entry point changed from `export =` to `export default` for Homebridge 2.0 compatibility.
- All relative imports updated with `.js` extensions (required by Node.js ESM resolution).
- TypeScript upgraded to ^5.7.0 with `target: ES2022`, `module: Node16`.
- ESLint upgraded to ^9.0.0 with flat config (`eslint.config.js` replaces `.eslintrc`).
- CI pipeline updated to test on Node.js 22 and 24 with GitHub Actions v4.
- Updated devDependencies: `@types/node` ^22, `rimraf` ^6, `nodemon` ^3.
