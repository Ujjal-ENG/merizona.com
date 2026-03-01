import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginatedResponse } from "../../common/interfaces";
import { Product } from "../catalog/schemas/product.schema";
import { Inventory } from "../inventory/schemas/inventory.schema";
import { Order } from "../orders/schemas/order.schema";
import { ApplyVendorDto } from "./dto/apply-vendor.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { Membership, MembershipDocument } from "./schemas/membership.schema";
import { Vendor, VendorDocument } from "./schemas/vendor.schema";

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);

  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  /**
   * Vendor application — creates vendor as 'pending' and grants owner membership.
   */
  async apply(userId: string, dto: ApplyVendorDto): Promise<VendorDocument> {
    // Check if user already has a vendor
    const existing = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException("User already belongs to a vendor");
    }

    // Generate slug
    const slug = this.generateSlug(dto.name);
    const slugExists = await this.vendorRepository.findOne({ where: { slug } });
    if (slugExists) {
      throw new ConflictException("Vendor name already taken");
    }

    // Create vendor
    const vendor = await this.vendorRepository.save(
      this.vendorRepository.create({
        name: dto.name,
        slug,
        description: dto.description,
        status: "pending",
        businessInfo: dto.businessInfo,
        commissionRate: 0.12, // Default 12%
        packageTier: dto.packageTier,
        packagePriceInCents: this.getPackagePriceInCents(dto.packageTier),
        packageStatus: "active",
      }),
    );

    // Create owner membership with full permissions
    await this.membershipRepository.save(
      this.membershipRepository.create({
        userId,
        vendorId: vendor._id,
        role: "owner",
        permissions: [
          "manage_products",
          "manage_orders",
          "manage_inventory",
          "manage_settings",
        ],
      }),
    );

    this.logger.log(
      `Vendor application submitted: ${dto.name} (${vendor._id})`,
    );
    return vendor;
  }

  async findById(id: string): Promise<VendorDocument | null> {
    return this.vendorRepository.findOne({ where: { _id: id } });
  }

  async findByIdOrFail(id: string): Promise<VendorDocument> {
    const vendor = await this.findById(id);
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    return vendor;
  }

  async findBySlug(slug: string): Promise<VendorDocument> {
    const vendor = await this.vendorRepository.findOne({ where: { slug } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    return vendor;
  }

  async findAll(
    query: PaginationDto & { status?: string },
  ): Promise<PaginatedResponse<VendorDocument>> {
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
      "name",
      "status",
    ]);

    const [data, total] = await this.vendorRepository.findAndCount({
      where: status
        ? ({ status: status as Vendor["status"] } as any)
        : undefined,
      order: { [sortField]: order === "asc" ? "ASC" : "DESC" } as any,
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async approve(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (vendor.packageStatus !== "active") {
      throw new BadRequestException(
        "Vendor package must be active before approval",
      );
    }

    if (vendor.status !== "pending") {
      throw new BadRequestException("Vendor is not in pending status");
    }

    vendor.status = "approved";
    await this.vendorRepository.save(vendor);

    this.logger.log(`Vendor approved: ${vendor.name} (${vendor._id})`);
    return vendor;
  }

  async suspend(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);
    vendor.status = "suspended";
    await this.vendorRepository.save(vendor);

    this.logger.log(`Vendor suspended: ${vendor.name} (${vendor._id})`);
    return vendor;
  }

  async update(
    vendorId: string,
    dto: UpdateVendorDto,
  ): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (dto.name) vendor.name = dto.name;
    if (dto.description !== undefined) vendor.description = dto.description;
    if (dto.businessInfo) {
      vendor.businessInfo = {
        ...(vendor.businessInfo || {}),
        ...dto.businessInfo,
      } as Vendor["businessInfo"];
    }

    return this.vendorRepository.save(vendor);
  }

  async getMembershipForUser(
    userId: string,
  ): Promise<MembershipDocument | null> {
    return this.membershipRepository.findOne({ where: { userId } });
  }

  async assertVendorCanOperate(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (vendor.status !== "approved") {
      throw new ForbiddenException(
        "Vendor must be approved by admin before running the business",
      );
    }

    if (vendor.packageStatus !== "active") {
      throw new ForbiddenException(
        "Vendor package must be active to run the business",
      );
    }

    return vendor;
  }

  async getStats(vendorId: string): Promise<{
    totalProducts: number;
    totalOrders: number;
    pendingOrders: number;
    revenue: number;
    lowStockItems: number;
  }> {
    const [
      totalProducts,
      totalOrders,
      pendingOrders,
      lowStockItems,
      revenueQuery,
    ] = await Promise.all([
      this.productRepository.count({ where: { vendorId } }),
      this.orderRepository.count({ where: { vendorId } }),
      this.orderRepository.count({
        where: { vendorId, status: In(["pending", "confirmed", "processing"]) },
      }),
      this.inventoryRepository
        .createQueryBuilder("inventory")
        .where("inventory.vendorId = :vendorId", { vendorId })
        .andWhere(
          "(inventory.quantityOnHand - inventory.quantityReserved) <= inventory.lowStockThreshold",
        )
        .getCount(),
      this.orderRepository
        .createQueryBuilder("order")
        .select(
          "COALESCE(SUM(order.totalInCents - order.platformCommissionInCents), 0)",
          "revenue",
        )
        .where("order.vendorId = :vendorId", { vendorId })
        .andWhere("order.status IN (:...statuses)", {
          statuses: ["confirmed", "processing", "shipped", "delivered"],
        })
        .getRawOne<{ revenue: string | number }>(),
    ]);

    const revenue = Number(revenueQuery?.revenue ?? 0);

    return {
      totalProducts,
      totalOrders,
      pendingOrders,
      revenue,
      lowStockItems,
    };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private pickSortField(sort: string, allowed: string[]): string {
    return allowed.includes(sort) ? sort : "createdAt";
  }

  private getPackagePriceInCents(tier: Vendor["packageTier"]): number {
    switch (tier) {
      case "starter":
        return 1999;
      case "growth":
        return 4999;
      case "scale":
        return 9999;
      default:
        return 1999;
    }
  }
}
