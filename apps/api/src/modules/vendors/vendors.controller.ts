import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { CheckAbility, CurrentUser } from "../../common/decorators";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AbilityGuard } from "../casl/ability.guard";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { VendorsService } from "./vendors.service";

@Controller("vendor")
@UseGuards(JwtAuthGuard, AbilityGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get("profile")
  @CheckAbility({ action: "read", subject: "Vendor" })
  async getProfile(@CurrentUser() user: UserContext) {
    if (!user.vendorId) {
      throw new ForbiddenException("Vendor membership is required");
    }
    return this.vendorsService.findByIdOrFail(user.vendorId);
  }

  @Get("stats")
  async getStats(@CurrentUser() user: UserContext) {
    if (!user.vendorId) {
      throw new ForbiddenException("Vendor membership is required");
    }

    await this.vendorsService.assertVendorCanOperate(user.vendorId);
    return this.vendorsService.getStats(user.vendorId);
  }

  @Patch("settings")
  @CheckAbility({ action: "update", subject: "Vendor" })
  async updateSettings(
    @CurrentUser() user: UserContext,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(user.vendorId!, dto);
  }
}
