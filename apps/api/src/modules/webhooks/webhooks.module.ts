import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersModule } from "../orders/orders.module";
import { WebhooksController } from "./webhooks.controller";
import { StripeWebhookEvent } from "./schemas/stripe-webhook-event.schema";
import { WebhooksService } from "./webhooks.service";

@Module({
  imports: [TypeOrmModule.forFeature([StripeWebhookEvent]), OrdersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
