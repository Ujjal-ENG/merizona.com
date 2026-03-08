import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginatedResponse } from "../../common/interfaces";
import { Product } from "../catalog/schemas/product.schema";
import { Vendor } from "../vendors/schemas/vendor.schema";
import { Inventory, InventoryDocument } from "./schemas/inventory.schema";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async findByVendor(
    vendorId: string,
    query: PaginationDto & { lowStock?: boolean },
  ): Promise<PaginatedResponse<InventoryDocument>> {
    await this.assertVendorCanOperate(vendorId);

    const { page = 1, limit = 20, sort = "updatedAt", order = "desc" } = query;

    const sortField = this.pickSortField(sort, [
      "updatedAt",
      "createdAt",
      "sku",
      "quantityOnHand",
      "quantityReserved",
    ]);

    const qb = this.inventoryRepository
      .createQueryBuilder("inventory")
      .leftJoinAndSelect("inventory.product", "product")
      .where("inventory.vendorId = :vendorId", { vendorId });

    // Filter for items below low stock threshold
    if (query.lowStock) {
      qb.andWhere(
        "(inventory.quantityOnHand - inventory.quantityReserved) <= inventory.lowStockThreshold",
      );
    }

    qb.orderBy(`inventory.${sortField}`, order === "asc" ? "ASC" : "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data: data.map((item) => this.withProductSummary(item)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async updateStock(
    sku: string,
    vendorId: string,
    data: {
      quantityOnHand?: number;
      lowStockThreshold?: number;
      warehouseLocation?: string;
    },
  ): Promise<InventoryDocument> {
    await this.assertVendorCanOperate(vendorId);

    const inventory = await this.inventoryRepository.findOne({
      where: { sku, vendorId },
    });

    if (!inventory) {
      throw new NotFoundException("Inventory item not found");
    }

    if (data.quantityOnHand !== undefined) {
      if (data.quantityOnHand < inventory.quantityReserved) {
        throw new BadRequestException(
          "Cannot set quantity below reserved amount",
        );
      }
      inventory.quantityOnHand = data.quantityOnHand;
    }

    if (data.lowStockThreshold !== undefined) {
      inventory.lowStockThreshold = data.lowStockThreshold;
    }

    if (data.warehouseLocation !== undefined) {
      inventory.warehouseLocation = data.warehouseLocation;
    }

    const updated = await this.inventoryRepository.save(inventory);
    this.logger.log(`Stock updated for SKU ${sku}: ${JSON.stringify(data)}`);
    return updated;
  }

  /**
   * Create inventory record for a new product variant.
   */
  async createForVariant(
    productId: string,
    vendorId: string,
    sku: string,
    quantity: number = 0,
  ): Promise<InventoryDocument> {
    return this.inventoryRepository.save(
      this.inventoryRepository.create({
        productId,
        vendorId,
        sku,
        quantityOnHand: quantity,
        quantityReserved: 0,
      }),
    );
  }

  private pickSortField(sort: string, allowed: string[]): string {
    return allowed.includes(sort) ? sort : "updatedAt";
  }

  private withProductSummary(
    inventory: Inventory & { product?: Product },
  ): Inventory {
    if (!inventory.product) {
      return inventory;
    }

    const { product, ...rest } = inventory as Inventory & { product: Product };

    return {
      ...rest,
      productId: {
        _id: product._id,
        title: product.title,
        slug: product.slug,
      } as any,
    };
  }

  private async assertVendorCanOperate(vendorId: string): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { _id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    if (vendor.status !== "approved") {
      throw new ForbiddenException(
        "Vendor must be approved by admin before running inventory operations",
      );
    }

    if (vendor.verificationStatus !== "verified") {
      throw new ForbiddenException(
        "Vendor must complete business verification before running inventory operations",
      );
    }

    if (vendor.packageStatus !== "active") {
      throw new ForbiddenException(
        "Vendor package must be active before running the business",
      );
    }
  }
}
