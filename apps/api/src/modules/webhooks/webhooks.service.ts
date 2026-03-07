import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryFailedError, Repository } from "typeorm";
import { OrdersService } from "../orders/orders.service";
import { StripeWebhookEvent } from "./schemas/stripe-webhook-event.schema";

interface StripeWebhookPayload {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(StripeWebhookEvent)
    private readonly stripeWebhookEventRepository: Repository<StripeWebhookEvent>,
    private readonly ordersService: OrdersService,
  ) {}

  async handleStripeEvent(payload: StripeWebhookPayload): Promise<void> {
    const eventId = payload.id?.trim();
    const eventType = payload.type?.trim();

    if (!eventId || !eventType) {
      throw new BadRequestException("Invalid Stripe event payload");
    }

    const isFirstProcessing = await this.registerEvent(eventId, eventType, payload);
    if (!isFirstProcessing) {
      this.logger.log(`Ignoring duplicate Stripe event: ${eventId}`);
      return;
    }

    const session = payload.data?.object ?? {};
    const checkoutSessionId = this.pickCheckoutSessionId(session);

    switch (eventType) {
      case "checkout.session.completed": {
        const paymentStatus = this.pickStringField(session, "payment_status");
        if (paymentStatus === "paid" && checkoutSessionId) {
          await this.ordersService.markCheckoutSessionPaid(checkoutSessionId);
        } else {
          this.logger.log(
            `checkout.session.completed received with payment_status='${paymentStatus ?? "unknown"}' for session '${checkoutSessionId ?? "unknown"}'`,
          );
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        if (checkoutSessionId) {
          await this.ordersService.markCheckoutSessionPaid(checkoutSessionId);
        }
        break;
      }

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        if (checkoutSessionId) {
          await this.ordersService.markCheckoutSessionFailed(checkoutSessionId);
        }
        break;
      }

      default:
        this.logger.debug(`Unhandled Stripe event type: ${eventType}`);
    }
  }

  private async registerEvent(
    eventId: string,
    eventType: string,
    payload: StripeWebhookPayload,
  ): Promise<boolean> {
    try {
      await this.stripeWebhookEventRepository.insert(
        this.stripeWebhookEventRepository.create({
          eventId,
          type: eventType,
          payload: payload as Record<string, unknown>,
        }),
      );
      return true;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === "23505"
      ) {
        return false;
      }

      throw error;
    }
  }

  private pickCheckoutSessionId(
    session: Record<string, unknown>,
  ): string | undefined {
    return this.pickStringField(session, "id");
  }

  private pickStringField(
    payload: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = payload[key];
    return typeof value === "string" ? value : undefined;
  }
}
