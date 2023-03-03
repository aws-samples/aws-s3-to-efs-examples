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