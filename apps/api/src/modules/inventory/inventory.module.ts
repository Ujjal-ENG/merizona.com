import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CaslModule } from "../casl/casl.module";
import { Vendor } from "../vendors/schemas/vendor.schema";
import { InventoryController } from "./inventory.controller";
import { InventoryService } from "./inventory.service";
import { Inventory } from "./schemas/inventory.schema";

@Module({
  imports: [TypeOrmModule.forFeature([Inventory, Vendor]), CaslModule],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
