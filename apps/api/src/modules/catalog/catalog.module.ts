import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CaslModule } from "../casl/casl.module";
import { CatalogVendorController } from "./catalog-vendor.controller";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";
import { Product } from "./schemas/product.schema";

@Module({
  imports: [TypeOrmModule.forFeature([Product]), CaslModule],
  controllers: [CatalogController, CatalogVendorController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
