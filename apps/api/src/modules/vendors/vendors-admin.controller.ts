import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CheckAbility } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AbilityGuard } from "../casl/ability.guard";
import { RejectVendorVerificationDto } from "./dto/reject-vendor-verification.dto";
import { VendorsService } from "./vendors.service";

@Controller("admin/vendors")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class VendorsAdminController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @CheckAbility({ action: "manage", subject: "Vendor" })
  async findAll(@Query() query: PaginationDto & { status?: string }) {
    return this.vendorsService.findAll(query);
  }

  @Get(":id")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  async findOne(@Param("id") id: string) {
    return this.vendorsService.findAdminVendorById(id);
  }

  @Post(":id/verify")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async verify(@Param("id") id: string) {
    return this.vendorsService.verify(id);
  }

  @Post(":id/approve")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id") id: string) {
    return this.vendorsService.approve(id);
  }

  @Post(":id/reject")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param("id") id: string,
    @Body() dto: RejectVendorVerificationDto,
  ) {
    return this.vendorsService.reject(id, dto.reason);
  }

  @Post(":id/suspend")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async suspend(@Param("id") id: string) {
    return this.vendorsService.suspend(id);
  }

  @Post(":id/package/activate")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async activatePackage(@Param("id") id: string) {
    return this.vendorsService.activatePackage(id);
  }

  @Post(":id/package/deactivate")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async deactivatePackage(@Param("id") id: string) {
    return this.vendorsService.deactivatePackage(id);
  }
}
