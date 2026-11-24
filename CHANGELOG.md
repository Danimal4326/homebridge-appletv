# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [2.0.1] - 2026-11-24

### Fixed
- Plugin no longer crashes when an Apple TV is unreachable (e.g. `[Errno 113] Connect call failed`) or pyatv writes to stderr. node-pyatv `error` events are now handled: a single warning is logged when a device becomes unreachable, retries are logged at debug level, and an info message is logged when it recovers. Other Apple TVs keep working.
- Turning an unreachable Apple TV on/off now reports "No Response" in the Home app instead of failing silently.
- A misconfigured device no longer prevents the remaining devices from loading.

### Added
- Last known power state is persisted in the accessory cache, so the switch shows the correct state immediately after a Homebridge restart.

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
