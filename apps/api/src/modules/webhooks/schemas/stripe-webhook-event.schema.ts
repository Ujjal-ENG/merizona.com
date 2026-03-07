import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "stripe_webhook_events" })
@Index(["eventId"], { unique: true })
export class StripeWebhookEvent {
  @PrimaryGeneratedColumn("uuid")
  _id: string;

  @Column({ type: "varchar", length: 255, unique: true })
  eventId: string;

  @Column({ type: "varchar", length: 120 })
  type: string;

  @Column({ type: "jsonb", nullable: true })
  payload?: Record<string, unknown>;

  @CreateDateColumn({ type: "timestamptz" })
  processedAt: Date;
}

export type StripeWebhookEventDocument = StripeWebhookEvent;
