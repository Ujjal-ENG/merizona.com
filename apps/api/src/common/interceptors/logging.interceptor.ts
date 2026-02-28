import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

/**
 * Logs method, URL, and response time for every request.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const { method, url } = request;
    const now = Date.now();
    const userAgent = request.headers["user-agent"] || "unknown";

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `${method} ${url} - ${responseTime}ms [${userAgent.substring(0, 50)}]`,
          );
        },
        error: (error: Error) => {
          const responseTime = Date.now() - now;
          this.logger.warn(
            `${method} ${url} - ${responseTime}ms - ERROR: ${error.message}`,
          );
        },
      }),
    );
  }
}
