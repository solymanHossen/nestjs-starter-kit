import { Injectable, ValidationPipe } from '@nestjs/common';

/**
 * Global validation pipe registered via APP_PIPE in AppModule.
 *
 * - whitelist: strips properties not declared in the DTO class
 * - forbidNonWhitelisted: rejects requests containing unknown properties (400)
 * - transform: coerces plain objects into typed DTO instances
 * - enableImplicitConversion: allows string → number/boolean coercion on @Type decorators
 */
@Injectable()
export class StrictValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  }
}
