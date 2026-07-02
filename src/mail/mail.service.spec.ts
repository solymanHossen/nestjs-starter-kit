import { Test, type TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MAIL_IO_TOKEN } from './mail.constants';

const mockProvider = {
  send: jest.fn().mockResolvedValue(undefined),
};

describe('MailService', () => {
  let service: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MailService, { provide: MAIL_IO_TOKEN, useValue: mockProvider }],
    }).compile();

    service = module.get<MailService>(MailService);
    jest.clearAllMocks();
    mockProvider.send.mockResolvedValue(undefined);
  });

  describe('sendPasswordResetEmail()', () => {
    it('delegates to the active provider with a subject, html body, and text body', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'https://app.example.com/reset');

      expect(mockProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Reset your password',
          html: expect.stringContaining('https://app.example.com/reset'),
          text: expect.stringContaining('https://app.example.com/reset'),
        }),
      );
    });
  });
});
