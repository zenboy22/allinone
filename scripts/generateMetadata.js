const { writeFileSync, mkdirSync } = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Get the version from package.json
const { version, description } = require('../package.json');
// get the version from latest git tag
const latestTag = execSync('git describe --tags --abbrev=0').toString().trim();

// Get the current Git commit hash
const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitTime = execSync('git log -1 --format=%cd --date=iso')
  .toString()
  .trim();

// Create the version info object
const versionInfo = {
  version,
  description,
  latestTag,
  commitHash,
  buildTime: new Date().toISOString(),
  commitTime: new Date(commitTime).toISOString(),
};

// Write the version info to a file
const outputPath = path.resolve(__dirname, '../resources/metadata.json');
const outputDir = path.dirname(outputPath);
// Ensure the output directory exists
mkdirSync(outputDir, { recursive: true });
// Write the version info to a JSON file
const jsonContent = JSON.stringify(versionInfo, null, 2);
writeFileSync(outputPath, jsonContent, 'utf8');
// Write the version info to a TypeScript file
console.log('Version info generated:', versionInfo);
