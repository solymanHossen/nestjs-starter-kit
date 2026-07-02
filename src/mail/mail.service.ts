import { Inject, Injectable } from '@nestjs/common';
import { MAIL_IO_TOKEN } from './mail.constants';
import type { IMailProvider } from './interfaces/mail-provider.interface';

@Injectable()
export class MailService {
  constructor(@Inject(MAIL_IO_TOKEN) private readonly provider: IMailProvider) {}

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    await this.provider.send({
      to,
      subject: 'Reset your password',
      text:
        `We received a request to reset your password.\n\n` +
        `Reset it here (valid for a limited time): ${resetUrl}\n\n` +
        `If you didn't request this, you can safely ignore this email.`,
      html:
        `<p>We received a request to reset your password.</p>` +
        `<p><a href="${resetUrl}">Click here to reset your password</a> (valid for a limited time).</p>` +
        `<p>If you didn't request this, you can safely ignore this email.</p>`,
    });
  }
}
