import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class PublicVendorsQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(["createdAt", "updatedAt", "name"])
  override sort?: "createdAt" | "updatedAt" | "name" = "createdAt";
}
