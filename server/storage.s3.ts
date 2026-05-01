/**
 * S3 Storage — replaces Manus Forge storage proxy with direct AWS S3.
 * Requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and S3_BUCKET env vars.
 * The package already includes @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner.
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_BUCKET = process.env.S3_BUCKET ?? "appraise-ai-uploads";
const S3_REGION = process.env.AWS_REGION ?? "us-east-1";
const PRESIGN_EXPIRES_SECONDS = 60 * 60; // 1 hour

let _s3Client: S3Client | null = null;

function getS3(): S3Client {
  if (!_s3Client) {
    _s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    });
  }
  return _s3Client;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\.\.\//g, "").replace(/\.\.\\/g, "");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const s3 = getS3();

  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: PRESIGN_EXPIRES_SECONDS }
  );

  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const s3 = getS3();

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
    { expiresIn: PRESIGN_EXPIRES_SECONDS }
  );

  return { key, url };
}

export async function storageDelete(relKey: string): Promise<boolean> {
  try {
    const key = normalizeKey(relKey);
    const s3 = getS3();
    await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch (err) {
    console.error("[Storage] delete failed:", err);
    return false;
  }
}
