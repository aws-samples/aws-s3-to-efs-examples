
/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

const { execSync } = require('child_process');
const { awscdk } = require('projen');
const { NodePackageManager } = require('projen/lib/javascript');
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: `${execSync('npm show aws-cdk-lib version')}`.trim(),
  defaultReleaseBranch: 'main',
  appEntrypoint: 'lib/infrastructure/app',
  name: 'aws-s3-to-efs',
  packageManager: NodePackageManager.NPM,
  gitignore: ['.DS_STORE', '.idea', '*.iml', '*.bkp', '*.dtmp','*.out.txt'],
  deps: ['@types/aws-lambda', '@aws-lambda-powertools/logger', '@aws-sdk/client-s3'],
  devDeps: ['cdk-nag'],
  license: 'MIT-0',
  copyrightOwner: 'Amazon.com, Inc. or its affiliates. All Rights Reserved.',
  /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.eslint.rules['import/no-extraneous-dependencies']=['error', { devDependencies: ['**/infrastructure/*.ts'] }];
project.synth();