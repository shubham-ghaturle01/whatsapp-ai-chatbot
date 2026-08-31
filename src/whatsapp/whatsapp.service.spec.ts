import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsappService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => ({
              WHATSAPP_PHONE_NUMBER_ID: '1249257764942206',
              WHATSAPP_ACCESS_TOKEN: 'test-token',
              GRAPH_API_VERSION: 'v25.0',
            })[key]),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
