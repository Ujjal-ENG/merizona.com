import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CheckAbility, CurrentUser } from "../../common/decorators";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AbilityGuard } from "../casl/ability.guard";
import { CheckoutDto } from "./dto/checkout.dto";
import { OrdersQueryDto } from "./dto/orders-query.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  @CheckAbility({ action: "create", subject: "Order" })
  async checkout(@CurrentUser() user: UserContext, @Body() dto: CheckoutDto) {
    if (user.role !== "customer") {
      throw new ForbiddenException("Only customers can create orders");
    }

    return this.ordersService.checkout(user._id, dto);
  }
}

@Controller("account/orders")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AccountOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @CheckAbility({ action: "read", subject: "Order" })
  async findMyOrders(
    @CurrentUser() user: UserContext,
    @Query() query: OrdersQueryDto,
  ) {
    return this.ordersService.findByCustomer(user._id, query);
  }

  @Get(":id")
  @CheckAbility({ action: "read", subject: "Order" })
  async findMyOrderById(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    return this.ordersService.findCustomerOrderById(user._id, id);
  }
}

@Controller("vendor/orders")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class VendorOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @CheckAbility({ action: "read", subject: "Order" })
  async findVendorOrders(
    @CurrentUser() user: UserContext,
    @Query() query: OrdersQueryDto,
  ) {
    if (!user.vendorId) {
      throw new ForbiddenException("Vendor membership is required");
    }

    return this.ordersService.findByVendor(user.vendorId!, query);
  }

  @Patch(":id/status")
  @CheckAbility({ action: "update", subject: "Order" })
  async updateVendorOrderStatus(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    if (!user.vendorId) {
      throw new ForbiddenException("Vendor membership is required");
    }

    return this.ordersService.updateVendorOrderStatus(id, user.vendorId, dto.status);
  }
}

@Controller("admin/orders")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @CheckAbility({ action: "read", subject: "Order" })
  async findAllOrders(
    @CurrentUser() user: UserContext,
    @Query() query: OrdersQueryDto,
  ) {
    if (user.role !== "platform_admin") {
      throw new ForbiddenException("Only platform admins can view all orders");
    }

    return this.ordersService.findAll(query);
  }
}
