import { IsIn, IsInt, IsString, Max, MaxLength, Min } from "class-validator";

export class PresignVendorUploadDto {
  @IsIn(["product-image", "verification-document"])
  purpose: "product-image" | "verification-document";

  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(100)
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  size: number;
}
