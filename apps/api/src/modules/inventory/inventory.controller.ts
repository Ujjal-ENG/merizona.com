import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CheckAbility, CurrentUser } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AbilityGuard } from "../casl/ability.guard";
import { UpdateStockDto } from "./dto/update-stock.dto";
import { InventoryService } from "./inventory.service";

@Controller("vendor/inventory")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @CheckAbility({ action: "read", subject: "Inventory" })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() query: PaginationDto & { lowStock?: boolean },
  ) {
    return this.inventoryService.findByVendor(user.vendorId!, query);
  }

  @Patch(":sku")
  @CheckAbility({ action: "update", subject: "Inventory" })
  async updateStock(
    @CurrentUser() user: UserContext,
    @Param("sku") sku: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventoryService.updateStock(sku, user.vendorId!, dto);
  }
}
