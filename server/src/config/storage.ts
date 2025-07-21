import AWS from 'aws-sdk';
import path from 'path';
import fs from 'fs/promises';
import type { EnvConfig } from './env.js';

export interface StorageAdapter {
  uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string>;
  deleteFile(key: string): Promise<void>;
  getFileUrl(key: string): string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private uploadDir: string) {}

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await fs.mkdir(this.uploadDir, { recursive: true });
    const filePath = path.join(this.uploadDir, key);
    await fs.writeFile(filePath, buffer);
    return key;
  }

  async deleteFile(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  }

  getFileUrl(key: string): string {
    return `/files/${key}`;
  }
}

export class S3StorageAdapter implements StorageAdapter {
  private s3: AWS.S3;

  constructor(
    private bucket: string,
    config: {
      region: string;
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
    }
  ) {
    this.s3 = new AWS.S3({
      region: config.region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      endpoint: config.endpoint,
      s3ForcePathStyle: !!config.endpoint, // Required for MinIO
    });
  }

  async uploadFile(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const result = await this.s3.upload({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'private',
    }).promise();
    
    return result.Key;
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.deleteObject({
      Bucket: this.bucket,
      Key: key,
    }).promise();
  }

  getFileUrl(key: string): string {
    return this.s3.getSignedUrl('getObject', {
      Bucket: this.bucket,
      Key: key,
      Expires: 3600, // 1 hour
    });
  }
}

export function createStorageAdapter(config: EnvConfig): StorageAdapter {
  if (config.STORAGE_TYPE === 's3') {
    if (!config.S3_BUCKET || !config.S3_REGION || !config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 configuration is incomplete');
    }
    
    return new S3StorageAdapter(config.S3_BUCKET, {
      region: config.S3_REGION,
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      endpoint: config.S3_ENDPOINT,
    });
  }
  
  return new LocalStorageAdapter(config.UPLOAD_DIR);
}