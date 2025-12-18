// apps/server/src/mobile/interceptors/mobile-logging.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";

@Injectable()
export class MobileLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("MobileAPI");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body } = request;
    const userAgent = request.headers["user-agent"] ?? "Unknown";
    const userId = request.user?.id ?? "anonymous";
    const mobileLinkId = request.mobileLink?.id ?? "none";

    const startTime = Date.now();

    // Log request (omit sensitive data)
    const sanitizedBody = this.sanitizeBody(body);
    this.logger.log(
      `[REQ] ${method} ${url} | User: ${userId} | Link: ${mobileLinkId} | UA: ${userAgent.slice(0, 50)}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[RES] ${method} ${url} | User: ${userId} | ${duration}ms | OK`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `[ERR] ${method} ${url} | User: ${userId} | ${duration}ms | ${error.message}`,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== "object") return {};

    const sanitized = { ...body };

    // Remove or mask sensitive fields
    const sensitiveFields = ["password", "token", "apiKey", "secret"];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    // Truncate large fields like job descriptions
    const largeFields = ["jobDescription", "content"];
    for (const field of largeFields) {
      if (typeof sanitized[field] === "string" && (sanitized[field] as string).length > 100) {
        sanitized[field] = `${(sanitized[field] as string).slice(0, 100)}... [truncated]`;
      }
    }

    return sanitized;
  }
}

