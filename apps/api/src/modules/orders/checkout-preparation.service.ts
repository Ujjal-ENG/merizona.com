import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Product } from "../catalog/schemas/product.schema";
import { Vendor } from "../vendors/schemas/vendor.schema";
import { CheckoutOrderItemDto } from "./dto/checkout.dto";
import { OrderItem } from "./schemas/order.schema";

export type PreparedCheckoutItem = OrderItem & { vendorId: string };

export interface PreparedCheckoutContext {
  items: PreparedCheckoutItem[];
  vendorIds: string[];
  vendorsById: Map<string, Vendor>;
}

@Injectable()
export class CheckoutPreparationService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async prepare(
    checkoutItems: CheckoutOrderItemDto[],
  ): Promise<PreparedCheckoutContext> {
    const products = await this.productRepository.find({
      where: {
        _id: In([...new Set(checkoutItems.map((item) => item.productId))]),
      },
      relations: ["variants", "images"],
    });

    const productsById = new Map(products.map((product) => [product._id, product]));

    const items: PreparedCheckoutItem[] = checkoutItems.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      if (product.status !== "published") {
        throw new BadRequestException(
          `Product '${product.title}' is not available for checkout`,
        );
      }

      const variant = product.variants.find((value) => value.sku === item.sku);
      if (!variant) {
        throw new BadRequestException(
          `Variant SKU '${item.sku}' does not exist for product '${product.title}'`,
        );
      }

      return {
        productId: product._id,
        sku: variant.sku,
        title: product.title,
        priceInCents: variant.priceInCents,
        quantity: item.quantity,
        imageUrl:
          product.images?.find(
            (img) => img.variantId === variant._id || !img.variantId,
          )?.url ?? "",
        vendorId: product.vendorId,
      };
    });

    const vendorIds = [...new Set(items.map((item) => item.vendorId))];
    const vendors = await this.vendorRepository.findBy({ _id: In(vendorIds) });

    if (vendors.length !== vendorIds.length) {
      throw new NotFoundException("Vendor not found for checkout items");
    }

    const vendorsById = new Map(vendors.map((vendor) => [vendor._id, vendor]));
    for (const vendorId of vendorIds) {
      const vendor = vendorsById.get(vendorId);
      if (!vendor) {
        throw new NotFoundException("Vendor not found for checkout items");
      }

      this.assertVendorIsOrderable(vendor);
    }

    return { items, vendorIds, vendorsById };
  }

  private assertVendorIsOrderable(vendor: Vendor): void {
    if (vendor.status !== "approved") {
      throw new BadRequestException(
        `Vendor '${vendor.name}' is not approved to accept orders`,
      );
    }

    if (vendor.verificationStatus !== "verified") {
      throw new BadRequestException(
        `Vendor '${vendor.name}' has not completed business verification`,
      );
    }

    if (vendor.packageStatus !== "active") {
      throw new BadRequestException(
        `Vendor '${vendor.name}' does not have an active package`,
      );
    }
  }
}
