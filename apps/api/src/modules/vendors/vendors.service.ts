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
import { StorageService } from "../storage/storage.service";
import { Product } from "../catalog/schemas/product.schema";
import { Inventory } from "../inventory/schemas/inventory.schema";
import { Order } from "../orders/schemas/order.schema";
import { UserDocument } from "../users/schemas/user.schema";
import { PublicVendorsQueryDto } from "./dto/public-vendors-query.dto";
import { SubmitVendorVerificationDto } from "./dto/submit-vendor-verification.dto";
import { UpdateVendorDto } from "./dto/update-vendor.dto";
import { Membership, MembershipDocument } from "./schemas/membership.schema";
import {
  Vendor,
  VendorDocument,
  VendorVerificationDocument,
  VendorVerificationStatus,
} from "./schemas/vendor.schema";

export interface PublicVendorView {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  status: Vendor["status"];
  businessInfo?: Vendor["businessInfo"];
  createdAt: Date;
  updatedAt: Date;
  stats: {
    productCount: number;
    reviewCount: number;
    avgRating: number;
  };
}

export interface SignedVendorVerificationDocument
  extends VendorVerificationDocument {
  downloadUrl?: string;
}

export type VendorWithSignedDocuments = VendorDocument & {
  verificationDocuments: SignedVendorVerificationDocument[];
};

export interface VendorVerificationView {
  vendor: VendorWithSignedDocuments | null;
  verificationStatus: VendorVerificationStatus;
  canAccessDashboard: boolean;
}

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);
  private readonly ownerPermissions = [
    "manage_products",
    "manage_orders",
    "manage_inventory",
    "manage_settings",
  ] as const;

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
    private readonly storageService: StorageService,
  ) {}

  async getVerificationByUser(userId: string): Promise<VendorVerificationView> {
    const vendor = await this.findByUserId(userId);
    if (!vendor) {
      return {
        vendor: null,
        verificationStatus: "not_started",
        canAccessDashboard: false,
      };
    }

    return {
      vendor: await this.withSignedVerificationDocuments(vendor),
      verificationStatus: vendor.verificationStatus,
      canAccessDashboard: this.canAccessDashboard(vendor),
    };
  }

  async submitVerification(
    userId: string,
    dto: SubmitVendorVerificationDto,
  ): Promise<VendorVerificationView> {
    const documents = this.normalizeVerificationDocuments(dto.documents);
    const existingVendor = await this.findByUserId(userId);

    if (existingVendor) {
      if (existingVendor.status === "suspended") {
        throw new ForbiddenException(
          "Suspended vendors cannot resubmit verification",
        );
      }

      if (existingVendor.verificationStatus === "submitted") {
        throw new BadRequestException("Verification is already under review");
      }

      if (existingVendor.verificationStatus === "verified") {
        throw new BadRequestException("Vendor is already verified");
      }

      existingVendor.name = dto.name.trim();
      existingVendor.slug = await this.generateUniqueSlug(
        existingVendor.name,
        existingVendor._id,
      );
      existingVendor.description = dto.description?.trim();
      existingVendor.businessInfo = {
        legalName: dto.businessInfo.legalName.trim(),
        taxId: dto.businessInfo.taxId?.trim(),
        address: dto.businessInfo.address?.trim(),
        city: dto.businessInfo.city?.trim(),
        state: dto.businessInfo.state?.trim(),
        country: dto.businessInfo.country?.trim(),
      };
      existingVendor.packageTier = dto.packageTier;
      existingVendor.packagePriceInCents = this.getPackagePriceInCents(
        dto.packageTier,
      );
      existingVendor.status = "pending";
      existingVendor.verificationStatus = "submitted";
      existingVendor.verificationDocuments = documents;
      existingVendor.verificationSubmittedAt = new Date();
      existingVendor.verificationReviewedAt = null as any;
      existingVendor.verificationRejectionReason = null as any;

      const vendor = await this.vendorRepository.save(existingVendor);
      this.logger.log(`Vendor verification resubmitted: ${vendor._id}`);

      return {
        vendor: await this.withSignedVerificationDocuments(vendor),
        verificationStatus: vendor.verificationStatus,
        canAccessDashboard: this.canAccessDashboard(vendor),
      };
    }

    const membership = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (membership) {
      throw new ConflictException("User already belongs to a vendor");
    }

    const name = dto.name.trim();
    const slug = await this.generateUniqueSlug(name);
    const vendor = await this.vendorRepository.save(
      this.vendorRepository.create({
        name,
        slug,
        description: dto.description?.trim(),
        status: "pending",
        verificationStatus: "submitted",
        businessInfo: {
          legalName: dto.businessInfo.legalName.trim(),
          taxId: dto.businessInfo.taxId?.trim(),
          address: dto.businessInfo.address?.trim(),
          city: dto.businessInfo.city?.trim(),
          state: dto.businessInfo.state?.trim(),
          country: dto.businessInfo.country?.trim(),
        },
        verificationDocuments: documents,
        verificationSubmittedAt: new Date(),
        commissionRate: 0.12,
        packageTier: dto.packageTier,
        packagePriceInCents: this.getPackagePriceInCents(dto.packageTier),
        packageStatus: "active",
      }),
    );

    await this.membershipRepository.save(
      this.membershipRepository.create({
        userId,
        vendorId: vendor._id,
        role: "owner",
        permissions: [...this.ownerPermissions],
      }),
    );

    this.logger.log(`Vendor verification submitted: ${vendor._id}`);

    return {
      vendor: await this.withSignedVerificationDocuments(vendor),
      verificationStatus: vendor.verificationStatus,
      canAccessDashboard: this.canAccessDashboard(vendor),
    };
  }

  async findById(id: string): Promise<VendorDocument | null> {
    return this.vendorRepository.findOne({ where: { _id: id } });
  }

  async findByUserId(userId: string): Promise<VendorDocument | null> {
    const membership = await this.membershipRepository.findOne({
      where: { userId },
    });
    if (!membership) {
      return null;
    }

    return this.findById(membership.vendorId);
  }

  async ensureVendorAccountForUser(
    user: Pick<UserDocument, "_id" | "email" | "profile">,
  ): Promise<VendorDocument> {
    const membership = await this.getMembershipForUser(user._id);
    if (membership) {
      return this.findByIdOrFail(membership.vendorId);
    }

    const baseName =
      `${user.profile.firstName} ${user.profile.lastName}`.trim() || user.email;
    const name = `${baseName} Store`.slice(0, 100);
    const packageTier = "starter";
    const vendor = await this.vendorRepository.save(
      this.vendorRepository.create({
        name,
        slug: await this.generateUniqueSlug(name),
        status: "pending",
        verificationStatus: "not_started",
        commissionRate: 0.12,
        packageTier,
        packagePriceInCents: this.getPackagePriceInCents(packageTier),
        packageStatus: "active",
      }),
    );

    await this.membershipRepository.save(
      this.membershipRepository.create({
        userId: user._id,
        vendorId: vendor._id,
        role: "owner",
        permissions: [...this.ownerPermissions],
      }),
    );

    this.logger.log(`Vendor account provisioned: ${vendor._id} for user ${user._id}`);
    return vendor;
  }

  async findByIdOrFail(id: string): Promise<VendorDocument> {
    const vendor = await this.findById(id);
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    return vendor;
  }

  async findAdminVendorById(id: string): Promise<VendorWithSignedDocuments> {
    const vendor = await this.findByIdOrFail(id);
    return this.withSignedVerificationDocuments(vendor);
  }

  async findBySlug(slug: string): Promise<VendorDocument> {
    const vendor = await this.vendorRepository.findOne({ where: { slug } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }
    return vendor;
  }

  async findPublicVendors(
    query: PublicVendorsQueryDto,
  ): Promise<PaginatedResponse<PublicVendorView>> {
    const {
      page = 1,
      limit = 20,
      sort = "createdAt",
      order = "desc",
      search,
    } = query;

    const sortField = this.pickSortField(sort, [
      "createdAt",
      "updatedAt",
      "name",
    ]);

    const qb = this.vendorRepository
      .createQueryBuilder("vendor")
      .where("vendor.status = :status", { status: "approved" })
      .andWhere("vendor.verificationStatus = :verificationStatus", {
        verificationStatus: "verified",
      })
      .andWhere("vendor.packageStatus = :packageStatus", {
        packageStatus: "active",
      });

    if (search) {
      qb.andWhere(
        `(
          vendor.name ILIKE :search
          OR COALESCE(vendor.description, '') ILIKE :search
          OR COALESCE(vendor."businessInfo"->>'city', '') ILIKE :search
          OR COALESCE(vendor."businessInfo"->>'country', '') ILIKE :search
        )`,
        { search: `%${search}%` },
      );
    }

    qb.orderBy(`vendor.${sortField}`, order === "asc" ? "ASC" : "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [vendors, total] = await qb.getManyAndCount();
    const data = await this.buildPublicVendorViews(vendors);

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

  async findPublicVendorBySlug(slug: string): Promise<PublicVendorView> {
    const normalizedSlug = slug.toLowerCase().trim();
    const vendor = await this.vendorRepository
      .createQueryBuilder("vendor")
      .where("vendor.slug = :slug", { slug: normalizedSlug })
      .andWhere("vendor.status = :status", { status: "approved" })
      .andWhere("vendor.verificationStatus = :verificationStatus", {
        verificationStatus: "verified",
      })
      .andWhere("vendor.packageStatus = :packageStatus", {
        packageStatus: "active",
      })
      .getOne();

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    const [view] = await this.buildPublicVendorViews([vendor]);
    return view;
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
      "verificationStatus",
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
    return this.verify(vendorId);
  }

  async verify(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (vendor.status === "suspended") {
      throw new BadRequestException("Suspended vendors cannot be verified");
    }

    if (vendor.packageStatus !== "active") {
      throw new BadRequestException(
        "Vendor package must be active before verification",
      );
    }

    if (vendor.verificationStatus !== "submitted") {
      throw new BadRequestException("Vendor verification is not pending review");
    }

    vendor.status = "approved";
    vendor.verificationStatus = "verified";
    vendor.verificationReviewedAt = new Date();
    vendor.verificationRejectionReason = null as any;
    await this.vendorRepository.save(vendor);

    this.logger.log(`Vendor verified: ${vendor.name} (${vendor._id})`);
    return vendor;
  }

  async reject(vendorId: string, reason: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (vendor.status === "suspended") {
      throw new BadRequestException("Suspended vendors cannot be rejected");
    }

    if (vendor.verificationStatus !== "submitted") {
      throw new BadRequestException("Vendor verification is not pending review");
    }

    vendor.status = "pending";
    vendor.verificationStatus = "rejected";
    vendor.verificationReviewedAt = new Date();
    vendor.verificationRejectionReason = reason.trim();
    await this.vendorRepository.save(vendor);

    this.logger.log(`Vendor verification rejected: ${vendor.name} (${vendor._id})`);
    return vendor;
  }

  async suspend(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);
    vendor.status = "suspended";
    await this.vendorRepository.save(vendor);

    this.logger.log(`Vendor suspended: ${vendor.name} (${vendor._id})`);
    return vendor;
  }

  async activatePackage(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);
    if (vendor.packageStatus === "active") {
      return vendor;
    }

    vendor.packageStatus = "active";
    await this.vendorRepository.save(vendor);
    this.logger.log(`Vendor package activated: ${vendor.name} (${vendor._id})`);
    return vendor;
  }

  async deactivatePackage(vendorId: string): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);
    if (vendor.packageStatus === "inactive") {
      return vendor;
    }

    vendor.packageStatus = "inactive";
    await this.vendorRepository.save(vendor);
    this.logger.log(
      `Vendor package deactivated: ${vendor.name} (${vendor._id})`,
    );
    return vendor;
  }

  async update(
    vendorId: string,
    dto: UpdateVendorDto,
  ): Promise<VendorDocument> {
    const vendor = await this.findByIdOrFail(vendorId);

    if (dto.name) {
      vendor.name = dto.name.trim();
      vendor.slug = await this.generateUniqueSlug(vendor.name, vendor._id);
    }
    if (dto.description !== undefined) vendor.description = dto.description?.trim();
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

    if (vendor.status === "suspended") {
      throw new ForbiddenException(
        "Suspended vendors cannot access vendor operations",
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

  private async buildPublicVendorViews(
    vendors: VendorDocument[],
  ): Promise<PublicVendorView[]> {
    const vendorIds = vendors.map((vendor) => vendor._id);
    const statsByVendorId = await this.getVendorMarketplaceStats(vendorIds);

    return vendors.map((vendor) => {
      const stats = statsByVendorId.get(vendor._id) ?? {
        productCount: 0,
        reviewCount: 0,
        avgRating: 0,
      };

      return {
        _id: vendor._id,
        name: vendor.name,
        slug: vendor.slug,
        description: vendor.description,
        logo: vendor.logo,
        status: vendor.status,
        businessInfo: vendor.businessInfo,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        stats,
      };
    });
  }

  private async getVendorMarketplaceStats(
    vendorIds: string[],
  ): Promise<Map<string, PublicVendorView["stats"]>> {
    const stats = new Map<string, PublicVendorView["stats"]>();

    if (vendorIds.length === 0) {
      return stats;
    }

    const rows = await this.productRepository
      .createQueryBuilder("product")
      .select("product.vendorId", "vendorId")
      .addSelect("COUNT(product._id)::int", "productCount")
      .addSelect(
        "COALESCE(SUM((product.rating->>'count')::int), 0)::int",
        "reviewCount",
      )
      .addSelect(
        "COALESCE(SUM(((product.rating->>'avg')::numeric) * ((product.rating->>'count')::int)), 0)::numeric",
        "weightedRatingSum",
      )
      .where("product.vendorId IN (:...vendorIds)", { vendorIds })
      .andWhere("product.status = :status", { status: "published" })
      .groupBy("product.vendorId")
      .getRawMany<{
        vendorId: string;
        productCount: string | number;
        reviewCount: string | number;
        weightedRatingSum: string | number;
      }>();

    for (const row of rows) {
      const productCount = Number(row.productCount ?? 0);
      const reviewCount = Number(row.reviewCount ?? 0);
      const weightedRatingSum = Number(row.weightedRatingSum ?? 0);
      const avgRating =
        reviewCount > 0
          ? Number((weightedRatingSum / reviewCount).toFixed(2))
          : 0;

      stats.set(row.vendorId, {
        productCount,
        reviewCount,
        avgRating,
      });
    }

    return stats;
  }

  private async withSignedVerificationDocuments(
    vendor: VendorDocument,
  ): Promise<VendorWithSignedDocuments> {
    const verificationDocuments = await Promise.all(
      (vendor.verificationDocuments ?? []).map(async (document) => ({
        ...document,
        downloadUrl: await this.storageService
          .createSignedDownloadUrl(document.url)
          .catch(() => undefined),
      })),
    );

    return Object.assign(vendor, {
      verificationDocuments,
    }) as VendorWithSignedDocuments;
  }

  private normalizeVerificationDocuments(
    documents: SubmitVendorVerificationDto["documents"],
  ): VendorVerificationDocument[] {
    const normalized = documents.map((document) => ({
      type: document.type,
      url: document.url.trim(),
    }));

    const uniqueTypes = new Set(normalized.map((document) => document.type));
    if (uniqueTypes.size !== 3) {
      throw new BadRequestException(
        "Business registration, tax document, and owner ID are required",
      );
    }

    if (normalized.some((document) => !document.url)) {
      throw new BadRequestException("Verification document URLs are required");
    }

    return normalized;
  }

  private canAccessDashboard(vendor: VendorDocument): boolean {
    return (
      vendor.status === "approved" &&
      vendor.verificationStatus === "verified" &&
      vendor.packageStatus === "active"
    );
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private async generateUniqueSlug(
    name: string,
    ignoreVendorId?: string,
  ): Promise<string> {
    const baseSlug = this.generateSlug(name) || "vendor";
    let candidate = baseSlug;
    let suffix = 2;

    while (true) {
      const existing = await this.vendorRepository.findOne({
        where: { slug: candidate },
      });

      if (!existing || existing._id === ignoreVendorId) {
        return candidate;
      }

      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
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
