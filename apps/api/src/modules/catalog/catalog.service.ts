import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginatedResponse } from "../../common/interfaces";
import { Vendor } from "../vendors/schemas/vendor.schema";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { Product, ProductDocument } from "./schemas/product.schema";

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Create product — vendor-scoped. Generates slug and validates uniqueness.
   */
  async create(
    vendorId: string,
    dto: CreateProductDto,
  ): Promise<ProductDocument> {
    const slug = this.generateSlug(dto.title);
    const exists = await this.productRepository.findOne({ where: { slug } });
    if (exists) {
      throw new ConflictException("Product with this title already exists");
    }

    const product = await this.productRepository.save(
      this.productRepository.create({
        vendorId,
        title: dto.title,
        slug,
        description: dto.description,
        category: dto.category || [],
        attributes: dto.attributes || {},
        variants: dto.variants || [],
        status: dto.status || "draft",
        tags: dto.tags || [],
      }),
    );

    this.logger.log(
      `Product created: ${product.title} (${product._id}) by vendor ${vendorId}`,
    );
    return product;
  }

  /**
   * Public catalog query — only published products.
   */
  async findPublished(
    query: PaginationDto & { category?: string; search?: string },
  ): Promise<PaginatedResponse<ProductDocument>> {
    const {
      page = 1,
      limit = 20,
      sort = "createdAt",
      order = "desc",
      category,
      search,
    } = query;

    const sortField = this.pickSortField(sort, [
      "createdAt",
      "updatedAt",
      "title",
      "status",
    ]);

    const qb = this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.vendor", "vendor")
      .where("product.status = :status", { status: "published" });

    if (category) {
      qb.andWhere(":category = ANY(product.category)", { category });
    }

    if (search) {
      qb.andWhere(
        `(
          product.title ILIKE :search
          OR COALESCE(product.description, '') ILIKE :search
          OR EXISTS (
            SELECT 1
            FROM unnest(product.tags) tag
            WHERE tag ILIKE :search
          )
        )`,
        { search: `%${search}%` },
      );
    }

    qb.orderBy(`product.${sortField}`, order === "asc" ? "ASC" : "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((product) => this.withVendorSummary(product)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findBySlug(slug: string): Promise<ProductDocument> {
    const product = await this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.vendor", "vendor")
      .where("product.slug = :slug", { slug })
      .andWhere("product.status = :status", { status: "published" })
      .getOne();

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return this.withVendorSummary(product);
  }

  /**
   * Vendor-scoped product listing.
   */
  async findByVendor(
    vendorId: string,
    query: PaginationDto & { status?: string },
  ): Promise<PaginatedResponse<ProductDocument>> {
    const {
      page = 1,
      limit = 20,
      sort = "createdAt",
      order = "desc",
      status,
    } = query;

    const sortField = this.pickSortField(sort, [
      "createdAt",
      "updatedAt",
      "title",
      "status",
    ]);

    const [data, total] = await this.productRepository.findAndCount({
      where: {
        vendorId,
        ...(status ? { status: status as Product["status"] } : {}),
      },
      order: { [sortField]: order === "asc" ? "ASC" : "DESC" } as any,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(
    productId: string,
    vendorId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDocument> {
    const product = await this.productRepository.findOne({
      where: { _id: productId },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    // ABAC: verify vendor ownership
    if (product.vendorId.toString() !== vendorId) {
      throw new ForbiddenException("You do not own this product");
    }

    if (dto.title) product.title = dto.title;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.category) product.category = dto.category;
    if (dto.attributes) product.attributes = dto.attributes;
    if (dto.variants) product.variants = dto.variants as Product["variants"];
    if (dto.status) product.status = dto.status;
    if (dto.tags) product.tags = dto.tags;

    const updated = await this.productRepository.save(product);
    this.logger.log(`Product updated: ${updated.title} (${updated._id})`);
    return updated;
  }

  async delete(productId: string, vendorId: string): Promise<void> {
    const product = await this.productRepository.findOne({
      where: { _id: productId },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (product.vendorId.toString() !== vendorId) {
      throw new ForbiddenException("You do not own this product");
    }

    // Soft delete — archive instead of hard delete
    product.status = "archived";
    await this.productRepository.save(product);
    this.logger.log(`Product archived: ${product.title} (${product._id})`);
  }

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
  }

  private pickSortField(sort: string, allowed: string[]): string {
    return allowed.includes(sort) ? sort : "createdAt";
  }

  private withVendorSummary(product: Product & { vendor?: Vendor }): Product {
    if (!product.vendor) {
      return product;
    }

    const { vendor, ...rest } = product as Product & { vendor: Vendor };

    return {
      ...rest,
      vendorId: {
        _id: vendor._id,
        name: vendor.name,
        slug: vendor.slug,
        logo: vendor.logo,
      } as any,
    };
  }
}
