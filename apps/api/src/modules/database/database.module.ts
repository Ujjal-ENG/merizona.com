import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const sslEnabled =
          configService.get<string>("DATABASE_SSL", "false") === "true";

        return {
          type: "postgres" as const,
          url: configService.get<string>(
            "DATABASE_URL",
            "postgres://postgres:postgres@localhost:5432/merizona",
          ),
          autoLoadEntities: true,
          synchronize: configService.get<string>("NODE_ENV") !== "production",
          ssl: sslEnabled ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
