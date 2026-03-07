import {
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

  @Post(":id/approve")
  @CheckAbility({ action: "manage", subject: "Vendor" })
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id") id: string) {
    return this.vendorsService.approve(id);
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
