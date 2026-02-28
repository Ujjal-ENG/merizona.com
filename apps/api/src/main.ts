import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const configService = app.get(ConfigService);

  // Cookie parsing/serialization support for auth cookies.
  await app.register(fastifyCookie as any);

  // Security
  app.use(helmet());

  // CORS — allow frontend origin
  app.enableCors({
    origin: configService.get<string>("FRONTEND_URL", "http://localhost:3000"),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cookie",
      "X-Internal-Token",
    ],
  });

  // Global prefix
  const globalPrefix = configService.get<string>("API_GLOBAL_PREFIX", "api/v1");
  app.setGlobalPrefix(globalPrefix);

  // Global validation pipe — whitelist strips unknown fields, forbidNonWhitelisted rejects them
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>("API_PORT", 3001);
  await app.listen(port, "0.0.0.0");

  logger.log(`🚀 API running on http://localhost:${port}/${globalPrefix}`);
  logger.log(
    `📋 Health check: http://localhost:${port}/${globalPrefix}/health`,
  );
}

bootstrap();
