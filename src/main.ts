import path from 'path';
import { App, Aws, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { CfnLocationEFS, CfnLocationS3, CfnTask } from 'aws-cdk-lib/aws-datasync';
import { GatewayVpcEndpointAwsService, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint, FileSystem, PerformanceMode } from 'aws-cdk-lib/aws-efs';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Architecture, FileSystem as LambdaFileSystem, Runtime } from 'aws-cdk-lib/aws-lambda';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { BlockPublicAccess, Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class S3ToEFViaDataSyncExample extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);
    const vpc = new Vpc(this, 'vpc', {
      vpcName: 's3-to-efs-via-datasync-example-vpc',
      maxAzs: 2,
      subnetConfiguration: [{
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        name: 'private-egress',

      }, {
        subnetType: SubnetType.PUBLIC,
        name: 'public',

      }],
      natGateways: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });
    const subnetSelection = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      onePerAz: true,
    });
    vpc.addGatewayEndpoint('s3-gw-endpoint', {
      subnets: [subnetSelection],
      service: GatewayVpcEndpointAwsService.S3,
    });
    // vpc.addInterfaceEndpoint("lambda-gw-endpoint", {
    //     subnets: subnetSelection,
    //     service: InterfaceVpcEndpointAwsService.LAMBDA
    // })
    const bucket = new Bucket(this, 'source-bucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });
    const sg = new SecurityGroup(this, 's3-to-efs-via-datasync-sg', {
      vpc: vpc,
      securityGroupName: 's3-to-efs-via-datasync-sg',

    });
    sg.addIngressRule(sg, Port.tcp(2049), 'Allow access to EFS');
    sg.addEgressRule(sg, Port.allTcp(), 'Allow all outbound');
    const fileSystem = new FileSystem(this, 'destination-efs', {
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      vpc: vpc,
      vpcSubnets: subnetSelection,
      fileSystemName: 's3-to-efs-via-datasync-example',
      securityGroup: sg,

    });


    const s3DataSyncRole = new Role(this, 's3-ds-role', {
      assumedBy: new ServicePrincipal('datasync.amazonaws.com'),
    });
    bucket.grantReadWrite(s3DataSyncRole);
    s3DataSyncRole.addToPolicy(new PolicyStatement({
      actions: ['s3:GetBucketLocation',
        's3:ListBucket',
        's3:ListBucketMultipartUploads'],
      effect: Effect.ALLOW,
      resources: [bucket.bucketArn],

    }));
    s3DataSyncRole.addToPolicy(new PolicyStatement({
      actions: ['s3:AbortMultipartUpload',
        's3:DeleteObject',
        's3:GetObject',
        's3:ListMultipartUploadParts',
        's3:GetObjectTagging',
        's3:PutObjectTagging',
        's3:PutObject',
        's3:ListObjectsV2'],
      effect: Effect.ALLOW,
      resources: [bucket.arnForObjects('*')],

    }));
    const src = new CfnLocationS3(this, 's3-source-location', {
      s3Config: {
        bucketAccessRoleArn: s3DataSyncRole.roleArn,
      },
      s3BucketArn: bucket.bucketArn,
    });

    const lg = new LogGroup(this, 'efs-task-log-group', {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: '/aws/datasync/s3-to-efs-via-datasync-task',
    });
    subnetSelection.subnets.map((value, index) => {
      const dst = new CfnLocationEFS(this, `efs-destination-location-${index}`, {

        efsFilesystemArn: fileSystem.fileSystemArn,
        ec2Config: {
          subnetArn: `arn:aws:ec2:${Aws.REGION}:${Aws.ACCOUNT_ID}:subnet/${value.subnetId}`,
          securityGroupArns: [`arn:aws:ec2:${Aws.REGION}:${Aws.ACCOUNT_ID}:security-group/${sg.securityGroupId}`],
        },
      });

      new CfnTask(this, `efs-task-${index}`, {
        destinationLocationArn: dst.attrLocationArn,
        sourceLocationArn: src.attrLocationArn,
        cloudWatchLogGroupArn: lg.logGroupArn,
        options: {
          logLevel: 'TRANSFER',
        },

      });
    });


  }
}

export class S3ToEFViaLambdaExample extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    const vpc = new Vpc(this, 'vpc', {
      vpcName: 's3-to-efs-lambda-example-vpc',
      maxAzs: 2,
      subnetConfiguration: [{
        subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        name: 'private-egress',

      }, {
        subnetType: SubnetType.PUBLIC,
        name: 'public',

      }],
      natGateways: 2,
      enableDnsHostnames: true,
      enableDnsSupport: true,
    });
    const subnetSelection = vpc.selectSubnets({
      subnetType: SubnetType.PRIVATE_WITH_EGRESS,
      onePerAz: true,
    });
    vpc.addGatewayEndpoint('s3-gw-endpoint', {
      subnets: [subnetSelection],
      service: GatewayVpcEndpointAwsService.S3,
    });
    // vpc.addInterfaceEndpoint("lambda-gw-endpoint", {
    //     subnets: subnetSelection,
    //     service: InterfaceVpcEndpointAwsService.LAMBDA
    // })
    const bucket = new Bucket(this, 'source-bucket', {
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const fileSystem = new FileSystem(this, 'destination-efs', {
      performanceMode: PerformanceMode.GENERAL_PURPOSE,
      vpc: vpc,
      vpcSubnets: subnetSelection,
      fileSystemName: 's3-to-efs-lambda-example',
    });
    const EFS_PATH = '/efs';
    const LOCAL_EFS_PATH = '/mnt/efs0';
    const ap = new AccessPoint(this, 'destination-efs-ap', {
      fileSystem: fileSystem,
      path: EFS_PATH,
      posixUser: {
        gid: '1000',
        uid: '1000',
      },
      createAcl: {
        ownerGid: '1000',
        ownerUid: '1000',
        permissions: '0777',
      },
    });
    const fn = new NodejsFunction(this, 'file-mover-function', {
      filesystem: LambdaFileSystem.fromEfsAccessPoint(ap, LOCAL_EFS_PATH),
      environment: {
        EFS_PATH: LOCAL_EFS_PATH,
      },
      vpc: vpc,
      vpcSubnets: subnetSelection,
      handler: 'handler',
      entry: path.join(__dirname, 'lambda.ts'),
      memorySize: 256,
      architecture: Architecture.ARM_64,
      timeout: Duration.seconds(30),
      runtime: Runtime.NODEJS_18_X,
    });
    fn.addEventSource(new S3EventSource(bucket, {
      events: [EventType.OBJECT_CREATED],
    }));
    bucket.grantRead(fn);


  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new S3ToEFViaLambdaExample(app, 'aws-s3-to-efs-via-lambda', { env: devEnv });
new S3ToEFViaDataSyncExample(app, 'aws-s3-to-efs-via-datasync', { env: devEnv });
// new MyStack(app, 'aws-s3-to-efs-prod', { env: prodEnv });

app.synth();