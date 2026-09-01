import { describe, expect, it } from '@jest/globals';
import { DocumentService } from './document.service';

describe('DocumentService', () => {
  const service = new DocumentService();

  it('extracts text files', async () => {
    await expect(
      service.extractText(Buffer.from('hospital timings'), 'text/plain', 'info.txt'),
    ).resolves.toBe('hospital timings');
  });

  it('rejects unsupported document types', async () => {
    await expect(
      service.extractText(Buffer.from('binary'), 'application/zip', 'archive.zip'),
    ).rejects.toThrow('Unsupported document type');
  });
});