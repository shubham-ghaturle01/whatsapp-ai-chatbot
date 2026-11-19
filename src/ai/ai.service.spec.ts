import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.AI_PROVIDER = 'openai';
    process.env.LOCAL_LLM_BASE_URL = 'http://localhost:8000';
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_ENABLED;
    jest.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should switch provider to local', () => {
    service.setProvider('local');
    expect(service.getProvider()).toBe('local');
  });

  it('should use Gemini when selected', async () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    service.setProvider('gemini');
    const geminiSpy = jest
      .spyOn(service as any, 'callGemini')
      .mockResolvedValue('Gemini answer');

    await expect(service.askQuestion('hello')).resolves.toBe('Gemini answer');
    expect(geminiSpy).toHaveBeenCalledWith('hello', {});
  });

  it('should fall back to the local AI service when OpenAI quota is exceeded', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Local answer from AI service' }),
    } as Response);

    const openAiSpy = jest
      .spyOn(service as any, 'callOpenAI')
      .mockRejectedValue({
        status: 429,
        message: 'insufficient_quota',
      });

    const response = await service.askQuestion('hello');

    expect(openAiSpy).toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/chat'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(response).toBe('Local answer from AI service');
  });

  it('should delete a single indexed document by id', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'deleted', count: 1 }),
    } as Response);

    const response = await service.deleteDocument('doc-123');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/documents/doc-123'),
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(response).toEqual({ status: 'deleted', count: 1 });
  });
});
