import { S3Client as AWSS3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

export class S3Client extends AWSS3Client {
  constructor() {
    super({
      region: 'auto',
      endpoint: env.r2.endpoint,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey
      }
    });
  }
}