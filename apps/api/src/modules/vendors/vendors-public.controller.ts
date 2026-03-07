import { Controller, Get, Param, Query } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { PublicVendorsQueryDto } from "./dto/public-vendors-query.dto";
import { VendorsService } from "./vendors.service";

@Controller("vendors")
export class VendorsPublicController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Get()
  @Public()
  async findPublicVendors(@Query() query: PublicVendorsQueryDto) {
    return this.vendorsService.findPublicVendors(query);
  }

  @Get(":slug")
  @Public()
  async findPublicVendorBySlug(@Param("slug") slug: string) {
    return this.vendorsService.findPublicVendorBySlug(slug);
  }
}
