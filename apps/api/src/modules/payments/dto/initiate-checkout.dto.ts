import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import {
  CheckoutOrderItemDto,
  CheckoutShippingAddressDto,
} from "../../orders/dto/checkout.dto";
import {
  ORDER_PAYMENT_PROVIDERS,
  type OrderPaymentProvider,
} from "../../orders/schemas/order.schema";

export class InitiateCheckoutDto {
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
  @IsIn(ORDER_PAYMENT_PROVIDERS)
  paymentProvider?: OrderPaymentProvider;
}
