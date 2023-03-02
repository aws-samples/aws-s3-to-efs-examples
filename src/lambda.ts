import * as fs from 'fs';
import path from 'path';
import { Logger } from '@aws-lambda-powertools/logger';
import { S3 } from '@aws-sdk/client-s3';
import { Context, S3Event } from 'aws-lambda';

const logger = new Logger({ serviceName: 'serverlessAirline' });
const s3Client = new S3({});
export const handler = async (event: S3Event, _context: Context): Promise<void> => {
  logger.info(`Event: ${JSON.stringify(event)}`);
  const efsPath = process.env.EFS_PATH!;
  for (const record of event.Records) {
    const data = await s3Client.getObject({
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key.replace(/\+/g, ' '),
    });
    if (data.Body != undefined) {
      const bytes = await data.Body.transformToByteArray();
      const dst = path.join(efsPath, record.s3.object.key);
      logger.info(`Writing ${record.s3.bucket.name}/${record.s3.object.key} to ${dst}`);
      fs.writeFileSync(dst, bytes);

    } else {
      logger.warn(`Unable to retrieve object ${record.s3.bucket.name}/${record.s3.object.key}`);
    }
  }


};