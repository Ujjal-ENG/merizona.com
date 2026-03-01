import { IsIn, IsOptional } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { ORDER_STATUSES, OrderStatus } from "../schemas/order.schema";

export class OrdersQueryDto extends PaginationDto {
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;
}
