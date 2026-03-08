import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { PaginatedResponse } from "../../common/interfaces";
import { Vendor } from "../vendors/schemas/vendor.schema";
import {
  CheckoutPreparationService,
  PreparedCheckoutContext,
  PreparedCheckoutItem,
} from "./checkout-preparation.service";
import { CheckoutDto } from "./dto/checkout.dto";
import { OrdersQueryDto } from "./dto/orders-query.dto";
import {
  Order,
  OrderDocument,
  OrderPaymentProvider,
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

export interface CheckoutResult {
  orders: OrderDocument[];
  summary: {
    orderCount: number;
    vendorCount: number;
    subtotalInCents: number;
    shippingInCents: number;
    taxInCents: number;
    totalInCents: number;
    platformCommissionInCents: number;
  };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly dataSource: DataSource,
    private readonly checkoutPreparationService: CheckoutPreparationService,
  ) {}

  async checkout(
    customerId: string,
    dto: CheckoutDto,
    preparedCheckout?: PreparedCheckoutContext,
  ): Promise<CheckoutResult> {
    const checkoutContext =
      preparedCheckout ?? (await this.checkoutPreparationService.prepare(dto.items));
    const itemsByVendor = this.groupItemsByVendor(checkoutContext.items);
    const vendorIds = checkoutContext.vendorIds;
    const vendorsById = checkoutContext.vendorsById;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderRepository = queryRunner.manager.getRepository(Order);
      const createdOrders: OrderDocument[] = [];

      for (const vendorId of vendorIds) {
        const vendor = vendorsById.get(vendorId);
        if (!vendor) {
          throw new NotFoundException("Vendor not found for checkout items");
        }

        const vendorItems = itemsByVendor.get(vendorId) ?? [];
        const subtotalInCents = vendorItems.reduce(
          (acc, item) => acc + item.priceInCents * item.quantity,
          0,
        );
        const shippingInCents = 0;
        const taxInCents = 0;
        const totalInCents = subtotalInCents + shippingInCents + taxInCents;
        const platformCommissionInCents = Math.round(
          totalInCents * Math.max(vendor.commissionRate ?? 0, 0),
        );

        const order = await orderRepository.save(
          orderRepository.create({
            orderNumber: await this.generateOrderNumber(orderRepository),
            customerId,
            vendorId,
            items: vendorItems.map(({ vendorId: _vendorId, ...item }) => item),
            shippingAddress: dto.shippingAddress,
            subtotalInCents,
            shippingInCents,
            taxInCents,
            totalInCents,
            platformCommissionInCents,
            status: "pending",
            paymentIntentId: dto.paymentIntentId,
            paymentProvider: dto.paymentProvider ?? "stripe",
          }),
        );

        createdOrders.push(order);
      }

      await queryRunner.commitTransaction();

      for (const order of createdOrders) {
        this.logger.log(`Order created: ${order.orderNumber} (${order._id})`);
      }

      return this.buildCheckoutResult(createdOrders, vendorIds.length);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
    await this.assertVendorCanOperate(vendorId);

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
    await this.assertVendorCanOperate(vendorId);

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

  async markCheckoutSessionPaid(
    checkoutSessionId: string,
    paymentProvider: OrderPaymentProvider = "stripe",
  ): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({ status: "confirmed" })
      .where("paymentIntentId = :checkoutSessionId", { checkoutSessionId })
      .andWhere(
        "(paymentProvider = :paymentProvider OR paymentProvider IS NULL)",
        { paymentProvider },
      )
      .andWhere("status = :currentStatus", { currentStatus: "pending" })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(
        `Marked ${affected} order(s) as confirmed for ${paymentProvider} checkout session ${checkoutSessionId}`,
      );
    } else {
      this.logger.warn(
        `No pending orders found for paid ${paymentProvider} checkout session ${checkoutSessionId}`,
      );
    }

    return affected;
  }

  async markCheckoutSessionFailed(
    checkoutSessionId: string,
    paymentProvider: OrderPaymentProvider = "stripe",
  ): Promise<number> {
    const result = await this.orderRepository
      .createQueryBuilder()
      .update(Order)
      .set({ status: "cancelled" })
      .where("paymentIntentId = :checkoutSessionId", { checkoutSessionId })
      .andWhere(
        "(paymentProvider = :paymentProvider OR paymentProvider IS NULL)",
        { paymentProvider },
      )
      .andWhere("status = :currentStatus", { currentStatus: "pending" })
      .execute();

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(
        `Marked ${affected} order(s) as cancelled for failed ${paymentProvider} checkout session ${checkoutSessionId}`,
      );
    } else {
      this.logger.warn(
        `No pending orders found for failed/expired ${paymentProvider} checkout session ${checkoutSessionId}`,
      );
    }

    return affected;
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

  private async generateOrderNumber(
    orderRepository: Repository<Order> = this.orderRepository,
  ): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    for (let i = 0; i < 8; i += 1) {
      const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
      const orderNumber = `MRZ-${date}-${suffix}`;

      const exists = await orderRepository.findOne({ where: { orderNumber } });
      if (!exists) {
        return orderNumber;
      }
    }

    throw new BadRequestException("Unable to generate a unique order number");
  }

  private groupItemsByVendor(
    items: PreparedCheckoutItem[],
  ): Map<string, PreparedCheckoutItem[]> {
    const grouped = new Map<string, PreparedCheckoutItem[]>();

    for (const item of items) {
      const bucket = grouped.get(item.vendorId);
      if (bucket) {
        bucket.push(item);
      } else {
        grouped.set(item.vendorId, [item]);
      }
    }

    return grouped;
  }

  private buildCheckoutResult(
    orders: OrderDocument[],
    vendorCount: number,
  ): CheckoutResult {
    const subtotalInCents = orders.reduce(
      (acc, order) => acc + order.subtotalInCents,
      0,
    );
    const shippingInCents = orders.reduce(
      (acc, order) => acc + order.shippingInCents,
      0,
    );
    const taxInCents = orders.reduce((acc, order) => acc + order.taxInCents, 0);
    const totalInCents = orders.reduce((acc, order) => acc + order.totalInCents, 0);
    const platformCommissionInCents = orders.reduce(
      (acc, order) => acc + order.platformCommissionInCents,
      0,
    );

    return {
      orders,
      summary: {
        orderCount: orders.length,
        vendorCount,
        subtotalInCents,
        shippingInCents,
        taxInCents,
        totalInCents,
        platformCommissionInCents,
      },
    };
  }

  private async assertVendorCanOperate(vendorId: string): Promise<void> {
    const vendor = await this.vendorRepository.findOne({ where: { _id: vendorId } });
    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    if (vendor.status !== "approved") {
      throw new ForbiddenException(
        "Vendor must be approved by admin before managing orders",
      );
    }

    if (vendor.packageStatus !== "active") {
      throw new ForbiddenException(
        "Vendor package must be active before running the business",
      );
    }
  }
}
