
const { execSync } = require('child_process');
const { awscdk } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: `${execSync('npm show aws-cdk-lib version')}`.trim(),
  defaultReleaseBranch: 'main',
  name: 'aws-s3-to-efs',
  packageManager: NodePackageManager.NPM,
  gitignore: ['.DS_STORE', '.idea', '*.iml', '*.bkp', '*.dtmp'],
  deps: ['@types/aws-lambda', '@aws-lambda-powertools/logger', '@aws-sdk/client-s3'], /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();