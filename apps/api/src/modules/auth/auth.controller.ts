import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FastifyReply } from "fastify";
import { CurrentUser, Public } from "../../common/decorators";
import { UserContext } from "../../common/interfaces";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @Public()
  async register(@Body() dto: RegisterDto, @Res() reply: FastifyReply) {
    const { user, tokens } = await this.authService.register(dto);

    this.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

    return reply.status(HttpStatus.CREATED).send({
      message: "Registration successful",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  }

  @Post("vendor/register")
  @Public()
  async registerVendor(@Body() dto: RegisterDto, @Res() reply: FastifyReply) {
    const { user, tokens } = await this.authService.registerVendor(dto);

    this.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

    return reply.status(HttpStatus.CREATED).send({
      message: "Vendor registration successful",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  }

  @Post("login")
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res() reply: FastifyReply) {
    const { user, tokens } = await this.authService.login(dto);

    this.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

    return reply.send({
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  }

  @Post("vendor/login")
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async loginVendor(@Body() dto: LoginDto, @Res() reply: FastifyReply) {
    const { user, tokens } = await this.authService.loginVendor(dto);

    this.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

    return reply.send({
      message: "Vendor login successful",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
    });
  }

  @Post("refresh")
  @Public()
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto, @Res() reply: FastifyReply) {
    const tokens = await this.authService.refreshTokens(
      dto.userId,
      dto.refreshToken,
    );

    this.setAuthCookies(reply, tokens.accessToken, tokens.refreshToken);

    return reply.send({ message: "Token refreshed" });
  }

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: UserContext, @Res() reply: FastifyReply) {
    await this.authService.logout(user._id);

    // Clear auth cookies
    (reply as any).clearCookie("access_token", { path: "/" });
    (reply as any).clearCookie("refresh_token", { path: "/" });

    return reply.send({ message: "Logged out successfully" });
  }

  @UseGuards(JwtAuthGuard)
  @Post("me")
  @HttpCode(HttpStatus.OK)
  async me(@CurrentUser() user: UserContext) {
    return user;
  }

  /**
   * Set HttpOnly, Secure, SameSite cookies for auth tokens.
   */
  private setAuthCookies(
    reply: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProduction = process.env.NODE_ENV === "production";

    (reply as any).setCookie("access_token", accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60, // 15 minutes
    });

    (reply as any).setCookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/api/v1/auth",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
}
