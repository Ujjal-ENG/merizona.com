import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators";
import { UserContext } from "../../common/interfaces";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { StorageService } from "../storage/storage.service";
import { PresignVendorUploadDto } from "./dto/presign-vendor-upload.dto";
import { SubmitVendorVerificationDto } from "./dto/submit-vendor-verification.dto";
import { VendorsService } from "./vendors.service";

@Controller("vendor")
@UseGuards(JwtAuthGuard)
export class VendorOnboardingController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly storageService: StorageService,
  ) {}

  @Get("verification")
  async getVerification(@CurrentUser() user: UserContext) {
    this.assertVendorAccount(user);
    return this.vendorsService.getVerificationByUser(user._id);
  }

  @Post("verification")
  async submitVerification(
    @CurrentUser() user: UserContext,
    @Body() dto: SubmitVendorVerificationDto,
  ) {
    this.assertVendorAccount(user);
    return this.vendorsService.submitVerification(user._id, dto);
  }

  @Post("uploads/presign")
  async createUploadUrl(
    @CurrentUser() user: UserContext,
    @Body() dto: PresignVendorUploadDto,
  ) {
    this.assertVendorAccount(user);

    if (dto.purpose === "product-image") {
      if (!user.vendorId) {
        throw new ForbiddenException("Vendor membership is required");
      }

      await this.vendorsService.assertVendorCanOperate(user.vendorId);
    }

    return this.storageService.createPresignedUpload({
      ...dto,
      userId: user._id,
      vendorId: user.vendorId,
    });
  }

  private assertVendorAccount(user: UserContext) {
    if (user.role !== "vendor") {
      throw new ForbiddenException("Only vendor accounts can access vendor onboarding");
    }
  }
}
