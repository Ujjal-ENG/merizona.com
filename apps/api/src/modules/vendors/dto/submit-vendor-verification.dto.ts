import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";
import {
  VENDOR_PACKAGE_TIERS,
  VENDOR_VERIFICATION_DOCUMENT_TYPES,
  VendorPackageTier,
  VendorVerificationDocumentType,
} from "../schemas/vendor.schema";

export class VerificationBusinessInfoDto {
  @IsString()
  @MinLength(1)
  legalName: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class VerificationDocumentDto {
  @IsIn(VENDOR_VERIFICATION_DOCUMENT_TYPES)
  type: VendorVerificationDocumentType;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  url: string;
}

export class SubmitVendorVerificationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ValidateNested()
  @Type(() => VerificationBusinessInfoDto)
  businessInfo: VerificationBusinessInfoDto;

  @IsIn(VENDOR_PACKAGE_TIERS)
  packageTier: VendorPackageTier;

  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => VerificationDocumentDto)
  documents: VerificationDocumentDto[];
}
