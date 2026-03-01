import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CheckAbility, CurrentUser } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AbilityGuard } from "../casl/ability.guard";
import { CatalogService } from "./catalog.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

/**
 * Vendor-facing product management endpoints.
 * All routes protected by ABAC — vendor can only manage their own products.
 */
@Controller("vendor/products")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class CatalogVendorController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  @CheckAbility({ action: "read", subject: "Product" })
  async findAll(
    @CurrentUser() user: UserContext,
    @Query() query: PaginationDto & { status?: string },
  ) {
    return this.catalogService.findByVendor(user.vendorId!, query);
  }

  @Get(":id")
  @CheckAbility({ action: "read", subject: "Product" })
  async findOne(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    return this.catalogService.findOneByVendor(id, user.vendorId!);
  }

  @Post()
  @CheckAbility({ action: "create", subject: "Product" })
  async create(
    @CurrentUser() user: UserContext,
    @Body() dto: CreateProductDto,
  ) {
    return this.catalogService.create(user.vendorId!, dto);
  }

  @Patch(":id")
  @CheckAbility({ action: "update", subject: "Product" })
  async update(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalogService.update(id, user.vendorId!, dto);
  }

  @Delete(":id")
  @CheckAbility({ action: "delete", subject: "Product" })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: UserContext, @Param("id") id: string) {
    await this.catalogService.delete(id, user.vendorId!);
  }
}
