import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../catalog/schemas/product.schema";
import { CaslModule } from "../casl/casl.module";
import { Vendor } from "../vendors/schemas/vendor.schema";
import {
  AccountOrdersController,
  AdminOrdersController,
  OrdersController,
  VendorOrdersController,
} from "./orders.controller";
import { CheckoutPreparationService } from "./checkout-preparation.service";
import { OrdersService } from "./orders.service";
import { Order } from "./schemas/order.schema";

@Module({
  imports: [TypeOrmModule.forFeature([Order, Product, Vendor]), CaslModule],
  controllers: [
    OrdersController,
    AccountOrdersController,
    VendorOrdersController,
    AdminOrdersController,
  ],
  providers: [OrdersService, CheckoutPreparationService],
  exports: [OrdersService, CheckoutPreparationService],
})
export class OrdersModule {}
