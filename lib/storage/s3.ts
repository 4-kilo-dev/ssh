/**
 * S3-compatible Object Storage Client.
 *
 * Implements AWS Signature Version 4 (SigV4) using standard Node.js crypto and fetch.
 * Works seamlessly with MinIO (self-hosted VPS) or AWS S3 / Cloudflare R2 without extra dependencies.
 */
import { createHmac, createHash } from "node:crypto";

export interface UploadOptions {
  buffer: Buffer | Uint8Array;
  key: string;
  contentType?: string;
}

function getEnvConfig() {
  const endpoint = process.env.S3_ENDPOINT || "http://178.105.14.11:29000";
  const bucket = process.env.S3_BUCKET_NAME || "venues";
  const accessKey = process.env.S3_ACCESS_KEY || "addisvenue_admin";
  const secretKey = process.env.S3_SECRET_KEY || "AddisVenue_Storage_Secret_2026!";
  const region = process.env.S3_REGION || "us-east-1";
  const publicUrl = process.env.S3_PUBLIC_URL || `${endpoint.replace(/\/+$/, "")}/${bucket}`;

  return { endpoint: endpoint.replace(/\/+$/, ""), bucket, accessKey, secretKey, region, publicUrl: publicUrl.replace(/\/+$/, "") };
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

/**
 * Uploads a file buffer directly to S3/MinIO using SigV4.
 * Returns the permanent public access URL.
 */
export async function uploadToS3(options: UploadOptions): Promise<string> {
  const { buffer, key, contentType = "image/jpeg" } = options;
  const config = getEnvConfig();
  const service = "s3";

  const cleanKey = key.replace(/^\/+/, "");
  const payloadHash = createHash("sha256").update(buffer).digest("hex");

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const url = new URL(config.endpoint);
  const host = url.host;
  const canonicalUri = `/${config.bucket}/${cleanKey}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const kDate = hmacSha256("AWS4" + config.secretKey, dateStamp);
  const kRegion = createHmac("sha256", kDate).update(config.region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const uploadEndpoint = `${config.endpoint}/${config.bucket}/${cleanKey}`;
  const res = await fetch(uploadEndpoint, {
    method: "PUT",
    headers: {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authHeader,
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`S3 upload failed (${res.status} ${res.statusText}): ${errorText}`);
  }

  return `${config.publicUrl}/${cleanKey}`;
}

/**
 * Deletes an object from S3/MinIO using SigV4.
 */
export async function deleteFromS3(key: string): Promise<boolean> {
  const config = getEnvConfig();
  const service = "s3";
  const cleanKey = key.replace(/^\/+/, "");

  const payloadHash = createHash("sha256").update("").digest("hex");
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const url = new URL(config.endpoint);
  const host = url.host;
  const canonicalUri = `/${config.bucket}/${cleanKey}`;
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `DELETE\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${config.region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;

  const kDate = hmacSha256("AWS4" + config.secretKey, dateStamp);
  const kRegion = createHmac("sha256", kDate).update(config.region).digest();
  const kService = createHmac("sha256", kRegion).update(service).digest();
  const kSigning = createHmac("sha256", kService).update("aws4_request").digest();
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authHeader = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const deleteEndpoint = `${config.endpoint}/${config.bucket}/${cleanKey}`;
  const res = await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authHeader,
    },
  });

  return res.ok || res.status === 404;
}
