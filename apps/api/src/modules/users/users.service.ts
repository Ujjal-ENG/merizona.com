import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { User, UserDocument } from "./schemas/user.schema";

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "platform_admin" | "vendor" | "customer";
  }): Promise<UserDocument> {
    const normalizedEmail = data.email.toLowerCase();
    const existing = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

    const user = this.userRepository.create({
      email: normalizedEmail,
      passwordHash,
      role: data.role || "customer",
      profile: {
        firstName: data.firstName,
        lastName: data.lastName,
      },
      status: "active",
      addresses: [],
    });

    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userRepository
      .createQueryBuilder("user")
      .addSelect(["user.passwordHash", "user.refreshTokenHash"])
      .where("LOWER(user.email) = LOWER(:email)", {
        email,
      })
      .andWhere("user.status = :status", { status: "active" })
      .getOne();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userRepository.findOne({ where: { _id: id } });
  }

  async findByIdWithRefreshToken(id: string): Promise<UserDocument | null> {
    return this.userRepository
      .createQueryBuilder("user")
      .addSelect("user.refreshTokenHash")
      .where("user._id = :id", { id })
      .getOne();
  }

  async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return user;
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; phone?: string },
  ): Promise<UserDocument> {
    const user = await this.findByIdOrFail(userId);

    user.profile = {
      ...user.profile,
      ...(data.firstName ? { firstName: data.firstName } : {}),
      ...(data.lastName ? { lastName: data.lastName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
    };

    return this.userRepository.save(user);
  }

  async setRefreshTokenHash(
    userId: string,
    hash: string | null,
  ): Promise<void> {
    await this.userRepository.update({ _id: userId }, { refreshTokenHash: hash });
  }

  async validatePassword(
    user: UserDocument,
    password: string,
  ): Promise<boolean> {
    if (!user.passwordHash) {
      return false;
    }

    return bcrypt.compare(password, user.passwordHash);
  }
}
