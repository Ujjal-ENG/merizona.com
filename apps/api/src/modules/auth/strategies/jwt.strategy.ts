import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { FastifyRequest } from "fastify";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserContext } from "../../../common/interfaces";

/**
 * JWT Strategy that extracts token from:
 * 1. HttpOnly cookie ('access_token') — primary, used by browser
 * 2. Authorization Bearer header — secondary, used by API clients
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from HttpOnly cookie first
        (request: FastifyRequest) => {
          const cookies = (request as any).cookies;
          if (cookies && cookies["access_token"]) {
            return cookies["access_token"];
          }
          return null;
        },
        // Fallback to Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        "JWT_SECRET",
        "dev-secret-change-me",
      ),
    });
  }

  /**
   * Passport calls this after token is verified.
   * The returned object is attached to request.user.
   */
  async validate(payload: any): Promise<UserContext> {
    if (!payload._id || !payload.email) {
      throw new UnauthorizedException("Invalid token payload");
    }

    return {
      _id: payload._id,
      email: payload.email,
      role: payload.role,
      vendorId: payload.vendorId,
      membership: payload.membership,
    };
  }
}
