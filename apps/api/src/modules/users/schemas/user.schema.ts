import { Exclude } from "class-transformer";
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export interface UserProfile {
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Address {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  zip: string;
  country: string;
  isDefault: boolean;
}

@Entity({ name: "users" })
@Index(["email"], { unique: true })
@Index(["status"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email: string;

  @Column({ type: "varchar", length: 255, select: false })
  @Exclude()
  passwordHash: string;

  @Column({
    type: "varchar",
    length: 20,
    default: "customer",
  })
  role: "platform_admin" | "vendor" | "customer";

  @Column({ type: "jsonb" })
  profile: UserProfile;

  @Column({ type: "jsonb", default: () => "'[]'::jsonb" })
  addresses: Address[];

  @Column({
    type: "varchar",
    length: 20,
    default: "active",
  })
  status: "active" | "suspended" | "deleted";

  @Column({ type: "varchar", length: 255, nullable: true, select: false })
  @Exclude()
  refreshTokenHash?: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
  }
}

export type UserDocument = User;
