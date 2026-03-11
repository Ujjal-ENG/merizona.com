import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CaslModule } from "../casl/casl.module";
import { Inventory } from "../inventory/schemas/inventory.schema";
import { Vendor } from "../vendors/schemas/vendor.schema";
import { CatalogVendorController } from "./catalog-vendor.controller";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { ProductImage } from "./schemas/product-image.schema";
import { ProductVariant } from "./schemas/product-variant.schema";
import { Product } from "./schemas/product.schema";

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, ProductImage, Inventory, Vendor]), CaslModule],
  controllers: [CatalogController, CatalogVendorController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
