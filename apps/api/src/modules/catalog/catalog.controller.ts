import { Controller, Get, Param, Query } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { CatalogService } from "./catalog.service";

/**
 * Public catalog endpoints — storefront facing.
 * No auth required, ISR-cacheable via Next.js fetch.
 */
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("products")
  @Public()
  async findAll(
    @Query() query: PaginationDto & { category?: string; search?: string },
  ) {
    return this.catalogService.findPublished(query);
  }

  @Get("products/:slug")
  @Public()
  async findBySlug(@Param("slug") slug: string) {
    return this.catalogService.findBySlug(slug);
  }
}
