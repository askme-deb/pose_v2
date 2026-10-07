import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Object storage for uploads (product images). Any S3-compatible store works:
// AWS S3, Cloudflare R2, or MinIO (docker/docker-compose.yml) locally. With no
// S3_* config, files go to ./uploads and are served by this service at
// /uploads — fine for local dev, not for multi-replica deployments.
const s3Configured = () => Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);

let client: S3Client | null = null;
function s3() {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      // MinIO and most self-hosted stores need path-style URLs.
      forcePathStyle: Boolean(process.env.S3_ENDPOINT),
      credentials: { accessKeyId: process.env.S3_ACCESS_KEY!, secretAccessKey: process.env.S3_SECRET_KEY! },
    });
  }
  return client;
}

export const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const ALLOWED_IMAGE_TYPES = Object.keys(EXTENSIONS);

/** Public base URL objects are reachable at (CDN / bucket domain). */
function publicUrl(key: string) {
  const base = process.env.S3_PUBLIC_URL || (process.env.S3_ENDPOINT ? `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET}` : `https://${process.env.S3_BUCKET}.s3.amazonaws.com`);
  return `${base.replace(/\/$/, '')}/${key}`;
}

export async function storeImage(tenantId: string, folder: string, file: { buffer: Buffer; mimetype: string }): Promise<{ key: string; url: string }> {
  const ext = EXTENSIONS[file.mimetype];
  const key = `tenants/${tenantId}/${folder}/${crypto.randomUUID()}.${ext}`;

  if (s3Configured()) {
    await s3().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return { key, url: publicUrl(key) };
  }

  const target = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.buffer);
  const base = process.env.UPLOADS_PUBLIC_URL || '/api/inventory/uploads';
  return { key, url: `${base}/${key}` };
}

/** Best-effort delete of a previously stored image, given its public URL. */
export async function deleteStoredImage(url: string | null | undefined) {
  if (!url) return;
  const match = url.match(/(tenants\/[^?#]+)/);
  if (!match) return;
  const key = match[1];
  try {
    if (s3Configured()) await s3().send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }));
    else await fs.unlink(path.join(LOCAL_UPLOAD_DIR, key));
  } catch {
    // Orphaned objects are harmless; never fail the request over cleanup.
  }
}
