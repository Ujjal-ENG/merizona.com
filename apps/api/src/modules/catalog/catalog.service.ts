import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, Repository } from "typeorm";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginatedResponse } from "../../common/interfaces";
import { Inventory } from "../inventory/schemas/inventory.schema";
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
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create product — vendor-scoped. Generates a unique slug and ensures SKU consistency.
   */
  async create(
    vendorId: string,
    dto: CreateProductDto,
  ): Promise<ProductDocument> {
    await this.assertVendorCanOperate(vendorId);

    const normalizedTitle = dto.title.trim();
    const normalizedVariants = this.normalizeVariants(dto.variants ?? []);
    const nextStatus = dto.status ?? "draft";

    if (nextStatus === "published" && normalizedVariants.length === 0) {
      throw new BadRequestException(
        "At least one product variant is required to publish",
      );
    }

    await this.assertNoSkuConflicts(normalizedVariants.map((variant) => variant.sku));

    const slug = await this.generateUniqueSlug(normalizedTitle);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productRepository = queryRunner.manager.getRepository(Product);
      const inventoryRepository = queryRunner.manager.getRepository(Inventory);

      const product = await productRepository.save(
        productRepository.create({
          vendorId,
          title: normalizedTitle,
          slug,
          description: dto.description?.trim(),
          category: this.normalizeStringArray(dto.category),
          attributes: this.normalizeAttributes(dto.attributes),
          variants: normalizedVariants,
          status: nextStatus,
          tags: this.normalizeStringArray(dto.tags),
        }),
      );

      if (normalizedVariants.length > 0) {
        await inventoryRepository.save(
          normalizedVariants.map((variant) =>
            inventoryRepository.create({
              productId: product._id,
              vendorId,
              sku: variant.sku,
              quantityOnHand: 0,
              quantityReserved: 0,
            }),
          ),
        );
      }

      await queryRunner.commitTransaction();

      this.logger.log(
        `Product created: ${product.title} (${product._id}) by vendor ${vendorId}`,
      );

      return product;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    await this.assertVendorCanOperate(vendorId);

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

    const normalizedStatus = this.pickStatus(status);

    const [data, total] = await this.productRepository.findAndCount({
      where: {
        vendorId,
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
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

  async findOneByVendor(
    productId: string,
    vendorId: string,
  ): Promise<ProductDocument> {
    await this.assertVendorCanOperate(vendorId);

    const product = await this.productRepository.findOne({
      where: { _id: productId, vendorId },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return product;
  }

  async update(
    productId: string,
    vendorId: string,
    dto: UpdateProductDto,
  ): Promise<ProductDocument> {
    await this.assertVendorCanOperate(vendorId);

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

    const normalizedVariants =
      dto.variants !== undefined
        ? this.normalizeVariants(dto.variants)
        : product.variants;

    const nextStatus = dto.status ?? product.status;
    if (nextStatus === "published" && normalizedVariants.length === 0) {
      throw new BadRequestException(
        "At least one product variant is required to publish",
      );
    }

    if (dto.variants !== undefined) {
      await this.assertNoSkuConflicts(
        normalizedVariants.map((variant) => variant.sku),
        product._id,
      );
      product.variants = normalizedVariants;
    }

    if (dto.title) {
      const normalizedTitle = dto.title.trim();
      product.title = normalizedTitle;
      product.slug = await this.generateUniqueSlug(normalizedTitle, product._id);
    }

    if (dto.description !== undefined) {
      product.description = dto.description?.trim();
    }

    if (dto.category !== undefined) {
      product.category = this.normalizeStringArray(dto.category);
    }

    if (dto.attributes !== undefined) {
      product.attributes = this.normalizeAttributes(dto.attributes);
    }

    if (dto.status) {
      product.status = dto.status;
    }

    if (dto.tags !== undefined) {
      product.tags = this.normalizeStringArray(dto.tags);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const productRepository = queryRunner.manager.getRepository(Product);
      const updated = await productRepository.save(product);

      if (dto.variants !== undefined) {
        await this.syncInventoryForVariants(
          queryRunner.manager,
          updated._id,
          vendorId,
          normalizedVariants,
        );
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Product updated: ${updated.title} (${updated._id})`);

      return updated;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(productId: string, vendorId: string): Promise<void> {
    await this.assertVendorCanOperate(vendorId);

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

  private async generateUniqueSlug(
    title: string,
    ignoreProductId?: string,
  ): Promise<string> {
    const baseSlug =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "product";

    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.productRepository.findOne({
        where: { slug: candidate },
      });

      if (!existing || existing._id === ignoreProductId) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  private pickSortField(sort: string, allowed: string[]): string {
    return allowed.includes(sort) ? sort : "createdAt";
  }

  private pickStatus(status?: string): Product["status"] | undefined {
    if (!status) {
      return undefined;
    }

    if (["draft", "published", "archived"].includes(status)) {
      return status as Product["status"];
    }

    return undefined;
  }

  private normalizeVariants(
    variants: CreateProductDto["variants"],
  ): Product["variants"] {
    const normalized = (variants ?? []).map((variant) => {
      const sku = variant.sku.trim();
      const label = variant.label.trim();

      if (!sku || !label) {
        throw new BadRequestException("Variant SKU and label are required");
      }

      return {
        sku,
        label,
        priceInCents: variant.priceInCents,
        compareAtPriceInCents: variant.compareAtPriceInCents,
        images: this.normalizeStringArray(variant.images),
      };
    });

    const duplicateSkus = this.findDuplicates(normalized.map((variant) => variant.sku));
    if (duplicateSkus.length > 0) {
      throw new BadRequestException(
        `Duplicate variant SKUs are not allowed: ${duplicateSkus.join(", ")}`,
      );
    }

    return normalized;
  }

  private normalizeAttributes(
    attributes?: Record<string, string>,
  ): Record<string, string> {
    if (!attributes) {
      return {};
    }

    const normalized: Record<string, string> = {};

    for (const [rawKey, rawValue] of Object.entries(attributes)) {
      const key = rawKey.trim();
      const value = (rawValue ?? "").toString().trim();

      if (!key || !value) {
        continue;
      }

      normalized[key] = value;
    }

    return normalized;
  }

  private normalizeStringArray(values?: string[]): string[] {
    if (!values || values.length === 0) {
      return [];
    }

    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  }

  private findDuplicates(values: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
      if (seen.has(value)) {
        duplicates.add(value);
      } else {
        seen.add(value);
      }
    }

    return [...duplicates];
  }

  private async assertNoSkuConflicts(
    skus: string[],
    ignoreProductId?: string,
  ): Promise<void> {
    if (skus.length === 0) {
      return;
    }

    const qb = this.inventoryRepository
      .createQueryBuilder("inventory")
      .select("inventory.sku", "sku")
      .where("inventory.sku IN (:...skus)", { skus });

    if (ignoreProductId) {
      qb.andWhere("inventory.productId <> :ignoreProductId", { ignoreProductId });
    }

    const conflicts = await qb.getRawMany<{ sku: string }>();

    if (conflicts.length > 0) {
      throw new ConflictException(
        `The following SKUs already exist: ${conflicts
          .map((item) => item.sku)
          .join(", ")}`,
      );
    }
  }

  private async syncInventoryForVariants(
    manager: EntityManager,
    productId: string,
    vendorId: string,
    variants: Product["variants"],
  ): Promise<void> {
    const inventoryRepository = manager.getRepository(Inventory);

    const existingItems = await inventoryRepository.find({
      where: { productId },
    });

    const nextSkus = new Set(variants.map((variant) => variant.sku));
    const removableItems = existingItems.filter((item) => !nextSkus.has(item.sku));

    const blockedRemovals = removableItems.filter(
      (item) => item.quantityOnHand > 0 || item.quantityReserved > 0,
    );

    if (blockedRemovals.length > 0) {
      throw new BadRequestException(
        `Cannot remove variants with existing inventory: ${blockedRemovals
          .map((item) => item.sku)
          .join(", ")}`,
      );
    }

    if (removableItems.length > 0) {
      await inventoryRepository.remove(removableItems);
    }

    const existingSkus = new Set(existingItems.map((item) => item.sku));
    const newInventoryItems = variants
      .filter((variant) => !existingSkus.has(variant.sku))
      .map((variant) =>
        inventoryRepository.create({
          productId,
          vendorId,
          sku: variant.sku,
          quantityOnHand: 0,
          quantityReserved: 0,
        }),
      );

    if (newInventoryItems.length > 0) {
      await inventoryRepository.save(newInventoryItems);
    }
  }

  private withVendorSummary(
    product: Product & { vendor?: Vendor },
  ): Product & { vendorName?: string } {
    if (!product.vendor) {
      return product;
    }

    const { vendor, ...rest } = product as Product & { vendor: Vendor };

    return {
      ...rest,
      vendorName: vendor.name,
    };
  }

  private async assertVendorCanOperate(vendorId: string): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { _id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    if (vendor.status !== "approved") {
      throw new ForbiddenException(
        "Vendor must be approved by admin before uploading products",
      );
    }

    if (vendor.packageStatus !== "active") {
      throw new ForbiddenException(
        "Vendor package must be active before running the business",
      );
    }
  }
}
