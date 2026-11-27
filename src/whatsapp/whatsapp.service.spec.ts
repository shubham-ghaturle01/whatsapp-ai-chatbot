import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const config = {
      WHATSAPP_PHONE_NUMBER_ID: '1249257764942206',
      WHATSAPP_ACCESS_TOKEN: 'test-token',
      GRAPH_API_VERSION: 'v27.0',
      WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => config[key as keyof typeof config]),
            getOrThrow: jest.fn((key: string) => config[key as keyof typeof config]),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('reports safe WhatsApp configuration status without exposing credentials', () => {
    const status = service.getConnectionStatus();
    expect(status).toEqual({
      configured: true,
      apiConfigured: true,
      webhookConfigured: true,
      phoneNumberId: '1249257764942206',
      graphApiVersion: 'v27.0',
    });
    expect(status).not.toHaveProperty('accessToken');
    expect(status).not.toHaveProperty('verifyToken');
  });
});
