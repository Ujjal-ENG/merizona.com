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
import { Vendor } from "./vendor.schema";

/**
 * Membership — the join table between Users and Vendors.
 * Contains the user's role and fine-grained permissions
 * within the vendor, used by CASL ABAC policies.
 */
@Entity({ name: "memberships" })
@Index(["userId", "vendorId"], { unique: true })
@Index(["vendorId"])
export class Membership {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "uuid" })
  userId: string;

  @Column({ type: "uuid" })
  vendorId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @ManyToOne(() => Vendor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vendorId" })
  vendor?: Vendor;

  @Column({
    type: "varchar",
    length: 20,
    default: "owner",
  })
  role: "owner" | "manager" | "staff";

  @Column({
    type: "text",
    array: true,
    default: () =>
      "ARRAY['manage_products','manage_orders','manage_inventory','manage_settings']::text[]",
  })
  permissions: string[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}

export type MembershipDocument = Membership;
