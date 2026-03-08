import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { UserContext } from "../../common/interfaces";
import { UserDocument } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import {
  Membership,
  MembershipDocument,
} from "../vendors/schemas/membership.schema";
import { VendorsService } from "../vendors/vendors.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly vendorsService: VendorsService,
    @InjectRepository(Membership)
    private readonly membershipRepository: Repository<Membership>,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    return this.registerWithRole(dto, "customer");
  }

  async registerVendor(
    dto: RegisterDto,
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    return this.registerWithRole(dto, "vendor");
  }

  async login(
    dto: LoginDto,
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    return this.loginWithRoles(dto, ["customer", "platform_admin"], {
      disallowedRoleMessage: "Vendor accounts must use vendor login",
    });
  }

  async loginVendor(
    dto: LoginDto,
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    return this.loginWithRoles(dto, ["vendor"], {
      disallowedRoleMessage: "Customer and admin accounts must use the main login",
    });
  }

  private async registerWithRole(
    dto: RegisterDto,
    role: "customer" | "vendor",
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role,
    });

    if (role === "vendor") {
      await this.vendorsService.ensureVendorAccountForUser(user);
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    this.logger.log(`${role} user registered: ${dto.email}`);
    return { user, tokens };
  }

  private async loginWithRoles(
    dto: LoginDto,
    allowedRoles: Array<UserDocument["role"]>,
    options: { disallowedRoleMessage: string },
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const isValid = await this.usersService.validatePassword(
      user,
      dto.password,
    );
    if (!isValid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status !== "active") {
      throw new UnauthorizedException("Account is not active");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new UnauthorizedException(options.disallowedRoleMessage);
    }

    if (user.role === "vendor") {
      await this.vendorsService.ensureVendorAccountForUser(user);
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user._id.toString(), tokens.refreshToken);

    this.logger.log(`User logged in: ${dto.email} (${user.role})`);
    return { user, tokens };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
  ): Promise<TokenPair> {
    const user = await this.usersService.findByIdWithRefreshToken(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Rotate: issue new pair, invalidate old
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(userId, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
    this.logger.log(`User logged out: ${userId}`);
  }

  /**
   * Build the UserContext for JWT payload — includes vendor membership info
   * so the ABAC guard can check vendor-scoped permissions.
   */
  async buildUserContext(userId: string): Promise<UserContext> {
    const user = await this.usersService.findByIdOrFail(userId);

    const context: UserContext = {
      _id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    // Check if user has a vendor membership
    const membership: MembershipDocument | null =
      await this.membershipRepository.findOne({
        where: { userId: user._id },
      });

    if (membership) {
      context.vendorId = membership.vendorId.toString();
      context.membership = {
        role: membership.role,
        permissions: membership.permissions,
      };
    }

    return context;
  }

  private async generateTokens(user: UserDocument): Promise<TokenPair> {
    // Build context with vendor info for the access token
    const context = await this.buildUserContext(user._id.toString());

    const accessToken = this.jwtService.sign(context);

    const refreshToken = this.jwtService.sign(
      { sub: user._id.toString(), type: "refresh" },
      {
        expiresIn: this.configService.get<string>("JWT_REFRESH_EXPIRY", "7d") as any,
      },
    );

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, this.SALT_ROUNDS);
    await this.usersService.setRefreshTokenHash(userId, hash);
  }
}
