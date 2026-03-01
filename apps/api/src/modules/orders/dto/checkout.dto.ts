import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class CheckoutOrderItemDto {
  @IsUUID()
  productId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CheckoutShippingAddressDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  label: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  line1: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  line2?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  state?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  zip: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  country: string;
}

export class CheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutOrderItemDto)
  items: CheckoutOrderItemDto[];

  @ValidateNested()
  @Type(() => CheckoutShippingAddressDto)
  shippingAddress: CheckoutShippingAddressDto;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  paymentIntentId?: string;
}
