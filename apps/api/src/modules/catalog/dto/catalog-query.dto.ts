import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export const CATALOG_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "title",
  "price",
  "rating",
  "reviewCount",
] as const;

export type CatalogSortField = (typeof CATALOG_SORT_FIELDS)[number];

export class CatalogQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendorSlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceInCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceInCents?: number;

  @IsOptional()
  @IsIn(CATALOG_SORT_FIELDS)
  override sort?: CatalogSortField = "createdAt";
}
