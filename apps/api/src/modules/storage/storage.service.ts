import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

type UploadPurpose = "product-image" | "verification-document";

@Injectable()
export class StorageService {
  private readonly s3Client: S3Client;
  private readonly endpoint: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>(
      "MINIO_ENDPOINT",
      "http://localhost:9000",
    );
    this.publicUrl = this.configService.get<string>(
      "MINIO_PUBLIC_URL",
      this.endpoint,
    );

    this.s3Client = new S3Client({
      region: "us-east-1",
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.get<string>(
          "MINIO_ACCESS_KEY",
          "minioadmin",
        ),
        secretAccessKey: this.configService.get<string>(
          "MINIO_SECRET_KEY",
          "minioadmin",
        ),
      },
    });
  }

  async createPresignedUpload(params: {
    purpose: UploadPurpose;
    fileName: string;
    contentType: string;
    size: number;
    userId: string;
    vendorId?: string;
  }): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
    const rule = this.getUploadRule(params.purpose);
    this.assertUploadAllowed(rule, params.contentType, params.size);

    const safeFileName = this.sanitizeFileName(params.fileName);
    const keyRoot =
      params.purpose === "product-image"
        ? `products/${params.vendorId}`
        : `vendor-verifications/${params.userId}`;
    const key = `${keyRoot}/${randomUUID()}-${safeFileName}`;

    try {
      const uploadUrl = await getSignedUrl(
        this.s3Client,
        new PutObjectCommand({
          Bucket: rule.bucket,
          Key: key,
          ContentType: params.contentType,
        }),
        { expiresIn: 15 * 60 },
      );

      return {
        uploadUrl,
        fileUrl: this.buildFileUrl(rule.bucket, key),
        key,
      };
    } catch (error) {
      throw new InternalServerErrorException("Unable to create upload URL");
    }
  }

  async createSignedDownloadUrl(fileUrl: string): Promise<string> {
    const { bucket, key } = this.parseStoredFileUrl(fileUrl);

    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: 15 * 60 },
    );
  }

  private getUploadRule(purpose: UploadPurpose): {
    bucket: string;
    maxSize: number;
    allowedContentTypes: string[];
  } {
    if (purpose === "product-image") {
      return {
        bucket: this.configService.get<string>(
          "MINIO_BUCKET_PRODUCTS",
          "product-images",
        ),
        maxSize: 5 * 1024 * 1024,
        allowedContentTypes: [
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/avif",
        ],
      };
    }

    return {
      bucket: this.configService.get<string>(
        "MINIO_BUCKET_VENDOR_VERIFICATIONS",
        "vendor-verifications",
      ),
      maxSize: 10 * 1024 * 1024,
      allowedContentTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ],
    };
  }

  private assertUploadAllowed(
    rule: { maxSize: number; allowedContentTypes: string[] },
    contentType: string,
    size: number,
  ) {
    if (!rule.allowedContentTypes.includes(contentType)) {
      throw new BadRequestException("Unsupported file type");
    }

    if (size > rule.maxSize) {
      throw new BadRequestException("File is too large");
    }
  }

  private buildFileUrl(bucket: string, key: string): string {
    return `${this.publicUrl.replace(/\/$/, "")}/${bucket}/${key}`;
  }

  private parseStoredFileUrl(fileUrl: string): { bucket: string; key: string } {
    try {
      const parsed = new URL(fileUrl);
      const [bucket, ...keyParts] = parsed.pathname.replace(/^\/+/, "").split("/");
      if (!bucket || keyParts.length === 0) {
        throw new Error("Invalid storage URL");
      }

      return { bucket, key: keyParts.join("/") };
    } catch {
      throw new BadRequestException("Invalid stored file URL");
    }
  }

  private sanitizeFileName(fileName: string): string {
    const normalized = fileName.trim().toLowerCase().replace(/[^a-z0-9.]+/g, "-");
    return normalized.replace(/^-+|-+$/g, "") || "upload.bin";
  }
}
