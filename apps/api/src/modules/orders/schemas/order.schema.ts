import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "../../users/schemas/user.schema";
import { Vendor } from "../../vendors/schemas/vendor.schema";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  productId: string;
  sku: string;
  title: string;
  priceInCents: number;
  quantity: number;
  imageUrl: string;
}

export interface OrderShippingAddress {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
}

@Entity({ name: "orders" })
@Index(["orderNumber"], { unique: true })
@Index(["customerId", "createdAt"])
@Index(["vendorId", "status"])
export class Order {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "varchar", length: 64, unique: true })
  orderNumber: string;

  @Column({ type: "uuid" })
  customerId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "customerId" })
  customer?: User;

  @Column({ type: "uuid" })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vendorId" })
  vendor?: Vendor;

  @Column({ type: "jsonb" })
  items: OrderItem[];

  @Column({ type: "jsonb" })
  shippingAddress: OrderShippingAddress;

  @Column({ type: "int" })
  subtotalInCents: number;

  @Column({ type: "int", default: 0 })
  shippingInCents: number;

  @Column({ type: "int", default: 0 })
  taxInCents: number;

  @Column({ type: "int" })
  totalInCents: number;

  @Column({ type: "int", default: 0 })
  platformCommissionInCents: number;

  @Column({
    type: "varchar",
    length: 32,
    default: "pending",
  })
  status: OrderStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  paymentIntentId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export type OrderDocument = Order;
