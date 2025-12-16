#!/usr/bin/env node

/**
 * ViewPort-CLI Installation Verification
 * 
 * Verifies that the package structure is correct and ready for publication
 */

const fs = require('fs');
const path = require('path');

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

const symbols = {
  success: `${colors.green}✓${colors.reset}`,
  error: `${colors.red}✗${colors.reset}`,
  warn: `${colors.yellow}⚠${colors.reset}`
};

// Verification checks
const checks = [];

function check(name, condition, errorMsg = '') {
  checks.push({
    name,
    passed: condition,
    error: errorMsg
  });
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// Run all checks
console.log(`\n${colors.cyan}📋 ViewPort-CLI Verification${colors.reset}\n`);

// 1. Check root files
check('package.json exists', fileExists('package.json'));
check('.npmignore exists', fileExists('.npmignore'));
check('README.md exists', fileExists('README.md'));
check('LICENSE exists', fileExists('LICENSE'));
check('CHANGELOG.md exists', fileExists('CHANGELOG.md'));

// 2. Check directories
check('bin/ directory exists', dirExists('bin'));
check('lib/ directory exists', dirExists('lib'));
check('scripts/ directory exists', dirExists('scripts'));
check('screenshot-server/ directory exists', dirExists('screenshot-server'));
check('.github/workflows/ directory exists', dirExists('.github/workflows'));

// 3. Check bin files
check('bin/cli.js exists', fileExists('bin/cli.js'));
check('bin/cli.js is executable', 
  fileExists('bin/cli.js') && (fs.statSync('bin/cli.js').mode & 0o111) !== 0,
  'Make executable: chmod +x bin/cli.js');

// 4. Check lib files
check('lib/platform-detector.js exists', fileExists('lib/platform-detector.js'));
check('lib/binary-locator.js exists', fileExists('lib/binary-locator.js'));

// 5. Check scripts
check('scripts/postinstall.js exists', fileExists('scripts/postinstall.js'));
check('scripts/compile-binaries.sh exists', fileExists('scripts/compile-binaries.sh'));
check('scripts/verify-install.js exists', fileExists('scripts/verify-install.js'));

// 6. Check screenshot server
check('screenshot-server/index.js exists', fileExists('screenshot-server/index.js'));
check('screenshot-server/package.json exists', fileExists('screenshot-server/package.json'));
check('screenshot-server/lib/launcher.js exists', fileExists('screenshot-server/lib/launcher.js'));

// 7. Check documentation
check('README.md exist', fileExists('README.md'));
check('INSTALL.md exists', fileExists('INSTALL.md'));
check('CONTRIBUTING.md exists', fileExists('CONTRIBUTING.md'));

// 8. Check CI/CD
check('.github/workflows/build-and-publish.yml exists', 
  fileExists('.github/workflows/build-and-publish.yml'));

// 9. Check platform binaries structure (not required for pre-release)
const binDir = path.join('bin', 'platform-binaries');
const hasBinaries = dirExists(binDir) && 
  fs.readdirSync(binDir).length > 0;
check('bin/platform-binaries/ populated (optional pre-release)', 
  hasBinaries, 'Build with: npm run build:all');

// 10. Validate package.json
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  check('package.json has name field', !!pkg.name && pkg.name === 'viewport-cli');
  check('package.json has version field', !!pkg.version);
  check('package.json has bin entry', !!pkg.bin && pkg.bin['viewport-cli']);
  check('package.json has postinstall script', 
    !!pkg.scripts && !!pkg.scripts.postinstall);
  check('package.json has files list', Array.isArray(pkg.files) && pkg.files.length > 0);
} catch (error) {
  check('package.json is valid JSON', false, error.message);
}

// Display results
console.log(colors.cyan + '═'.repeat(50) + colors.reset + '\n');

let passed = 0;
let failed = 0;
let warnings = 0;

for (const check of checks) {
  if (check.passed) {
    console.log(`${symbols.success} ${check.name}`);
    passed++;
  } else {
    console.log(`${symbols.error} ${check.name}`);
    if (check.error) {
      console.log(`  ${colors.yellow}→ ${check.error}${colors.reset}`);
    }
    failed++;
  }
}

console.log(`\n${colors.cyan}═`.repeat(50) + colors.reset);
console.log(`\nResults: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}\n`);

if (failed === 0) {
  console.log(`${colors.green}✨ Package structure is ready for publication!${colors.reset}\n`);
  
  if (!hasBinaries) {
    console.log(`${symbols.warn} Platform binaries not built yet\n`);
    console.log(`Build with: ${colors.cyan}npm run build${colors.reset}\n`);
  } else {
    console.log(`Next steps:\n`);
    console.log(`  1. Build binaries:  ${colors.cyan}npm run build${colors.reset}`);
    console.log(`  2. Run tests:       ${colors.cyan}npm test${colors.reset}`);
    console.log(`  3. Test locally:    ${colors.cyan}npm pack && npm install ./viewport-cli-1.0.0.tgz${colors.reset}`);
    console.log(`  4. Publish:         ${colors.cyan}npm publish${colors.reset}\n`);
  }
  
  process.exit(0);
} else {
  console.log(`${colors.red}✗ Fix the issues above before publishing${colors.reset}\n`);
  process.exit(1);
}
