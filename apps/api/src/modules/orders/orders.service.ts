import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { PaginatedResponse } from "../../common/interfaces";
import { Product } from "../catalog/schemas/product.schema";
import { Vendor } from "../vendors/schemas/vendor.schema";
import { CheckoutDto } from "./dto/checkout.dto";
import { OrdersQueryDto } from "./dto/orders-query.dto";
import {
  Order,
  OrderDocument,
  OrderItem,
  OrderStatus,
} from "./schemas/order.schema";

const VENDOR_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  refunded: [],
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async checkout(customerId: string, dto: CheckoutDto): Promise<OrderDocument> {
    const products = await this.productRepository.findBy({
      _id: In([...new Set(dto.items.map((item) => item.productId))]),
    });

    const productsById = new Map(products.map((product) => [product._id, product]));

    const mappedItems = dto.items.map((item) => {
      const product = productsById.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${item.productId}`);
      }

      const variant = product.variants.find((v) => v.sku === item.sku);
      if (!variant) {
        throw new BadRequestException(
          `Variant SKU '${item.sku}' does not exist for product '${product.title}'`,
        );
      }

      const mapped: OrderItem & { vendorId: string } = {
        productId: product._id,
        sku: variant.sku,
        title: product.title,
        priceInCents: variant.priceInCents,
        quantity: item.quantity,
        imageUrl: variant.images?.[0] ?? "",
        vendorId: product.vendorId,
      };

      return mapped;
    });

    const vendorIds = [...new Set(mappedItems.map((item) => item.vendorId))];
    if (vendorIds.length !== 1) {
      throw new BadRequestException(
        "Checkout currently supports items from a single vendor per order",
      );
    }

    const vendorId = vendorIds[0];
    const vendor = await this.vendorRepository.findOne({ where: { _id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found for checkout items");
    }

    const subtotalInCents = mappedItems.reduce(
      (acc, item) => acc + item.priceInCents * item.quantity,
      0,
    );

    const shippingInCents = 0;
    const taxInCents = 0;
    const totalInCents = subtotalInCents + shippingInCents + taxInCents;
    const platformCommissionInCents = Math.round(
      totalInCents * Math.max(vendor.commissionRate ?? 0, 0),
    );

    const order = await this.orderRepository.save(
      this.orderRepository.create({
        orderNumber: await this.generateOrderNumber(),
        customerId,
        vendorId,
        items: mappedItems.map(({ vendorId: _vendorId, ...item }) => item),
        shippingAddress: dto.shippingAddress,
        subtotalInCents,
        shippingInCents,
        taxInCents,
        totalInCents,
        platformCommissionInCents,
        status: "pending",
        paymentIntentId: dto.paymentIntentId,
      }),
    );

    this.logger.log(`Order created: ${order.orderNumber} (${order._id})`);

    return order;
  }

  async findByCustomer(
    customerId: string,
    query: OrdersQueryDto,
  ): Promise<PaginatedResponse<OrderDocument>> {
    return this.paginate(
      this.orderRepository
        .createQueryBuilder("order")
        .where("order.customerId = :customerId", { customerId }),
      query,
    );
  }

  async findCustomerOrderById(
    customerId: string,
    orderId: string,
  ): Promise<OrderDocument> {
    const order = await this.orderRepository.findOne({
      where: { _id: orderId, customerId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return order;
  }

  async findByVendor(
    vendorId: string,
    query: OrdersQueryDto,
  ): Promise<PaginatedResponse<OrderDocument>> {
    return this.paginate(
      this.orderRepository
        .createQueryBuilder("order")
        .where("order.vendorId = :vendorId", { vendorId }),
      query,
    );
  }

  async findAll(
    query: OrdersQueryDto,
  ): Promise<PaginatedResponse<OrderDocument>> {
    return this.paginate(this.orderRepository.createQueryBuilder("order"), query);
  }

  async updateVendorOrderStatus(
    orderId: string,
    vendorId: string,
    status: OrderStatus,
  ): Promise<OrderDocument> {
    const order = await this.orderRepository.findOne({
      where: { _id: orderId, vendorId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status === status) {
      return order;
    }

    const allowedNext = VENDOR_STATUS_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(status)) {
      throw new BadRequestException(
        `Invalid order status transition from '${order.status}' to '${status}'`,
      );
    }

    order.status = status;
    const updated = await this.orderRepository.save(order);
    this.logger.log(
      `Vendor ${vendorId} updated order ${order.orderNumber} (${order._id}) to ${status}`,
    );

    return updated;
  }

  private async paginate(
    baseQuery: ReturnType<Repository<Order>["createQueryBuilder"]>,
    query: OrdersQueryDto,
  ): Promise<PaginatedResponse<OrderDocument>> {
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
      "totalInCents",
      "status",
      "orderNumber",
    ]);

    if (status) {
      baseQuery.andWhere("order.status = :status", { status });
    }

    baseQuery
      .orderBy(`order.${sortField}`, order === "asc" ? "ASC" : "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await baseQuery.getManyAndCount();

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private pickSortField(sort: string, allowed: string[]): string {
    return allowed.includes(sort) ? sort : "createdAt";
  }

  private async generateOrderNumber(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    for (let i = 0; i < 8; i += 1) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const orderNumber = `MRZ-${date}-${suffix}`;

      const exists = await this.orderRepository.findOne({ where: { orderNumber } });
      if (!exists) {
        return orderNumber;
      }
    }

    throw new BadRequestException("Unable to generate a unique order number");
  }
}
