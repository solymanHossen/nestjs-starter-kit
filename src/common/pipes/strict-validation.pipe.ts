import { Injectable, ValidationPipe } from '@nestjs/common';

/**
 * Global validation pipe registered via APP_PIPE in AppModule.
 *
 * - whitelist: strips properties not declared in the DTO class
 * - forbidNonWhitelisted: rejects requests containing unknown properties (400)
 * - transform: coerces plain objects into typed DTO instances
 *
 * Implicit conversion is intentionally disabled. Use explicit @Type(() => Number)
 * or @Type(() => Boolean) on individual DTO fields so type coercion is
 * opt-in and auditable rather than happening silently across all inputs.
 */
@Injectable()
export class StrictValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  }
}
