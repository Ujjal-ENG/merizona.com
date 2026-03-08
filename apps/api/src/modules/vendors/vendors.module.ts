import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../catalog/schemas/product.schema";
import { CaslModule } from "../casl/casl.module";
import { Inventory } from "../inventory/schemas/inventory.schema";
import { Order } from "../orders/schemas/order.schema";
import { StorageModule } from "../storage/storage.module";
import { Membership } from "./schemas/membership.schema";
import { Vendor } from "./schemas/vendor.schema";
import { VendorsAdminController } from "./vendors-admin.controller";
import { VendorsController } from "./vendors.controller";
import { VendorOnboardingController } from "./vendor-onboarding.controller";
import { VendorsPublicController } from "./vendors-public.controller";
import { VendorsService } from "./vendors.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor, Membership, Product, Order, Inventory]),
    CaslModule,
    StorageModule,
  ],
  controllers: [
    VendorOnboardingController,
    VendorsController,
    VendorsAdminController,
    VendorsPublicController,
  ],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
