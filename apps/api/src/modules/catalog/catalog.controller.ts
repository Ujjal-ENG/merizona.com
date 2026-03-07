import { Controller, Get, Param, Query } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { CatalogService } from "./catalog.service";
import { CatalogQueryDto } from "./dto/catalog-query.dto";

/**
 * Public catalog endpoints — storefront facing.
 * No auth required, ISR-cacheable via Next.js fetch.
 */
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("products")
  @Public()
  async findAll(@Query() query: CatalogQueryDto) {
    return this.catalogService.findPublished(query);
  }

  @Get("products/:slug")
  @Public()
  async findBySlug(@Param("slug") slug: string) {
    return this.catalogService.findBySlug(slug);
  }
}
