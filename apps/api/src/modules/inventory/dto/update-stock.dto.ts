import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateStockDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  quantityOnHand?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;

  @IsOptional()
  @IsString()
  warehouseLocation?: string;
}
