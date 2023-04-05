import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { S3ToEFViaLambdaExample } from '../src/lib/infrastructure/app';

test('Snapshot', () => {
  const app = new App();
  const stack = new S3ToEFViaLambdaExample(app, 'test');

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});