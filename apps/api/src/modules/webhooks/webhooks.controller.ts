import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Public } from "../../common/decorators";
import { WebhooksService } from "./webhooks.service";

@Controller("webhooks")
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post("stripe")
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers("x-internal-token") internalToken: string | undefined,
    @Body() payload: Record<string, unknown>,
  ) {
    this.assertInternalToken(internalToken);
    await this.webhooksService.handleStripeEvent(payload as any);
    return { received: true };
  }

  private assertInternalToken(token?: string): void {
    const expected = this.configService.get<string>("INTERNAL_API_SECRET", "");

    if (!expected || token !== expected) {
      throw new UnauthorizedException("Invalid internal token");
    }
  }
}
