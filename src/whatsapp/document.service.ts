import { Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import * as XLSX from 'xlsx';

const MAX_EXTRACTED_CHARACTERS = 100_000;

@Injectable()
export class DocumentService {
  async extractText(
    buffer: Buffer,
    mimeType?: string,
    filename?: string,
  ): Promise<string> {
    const extension = filename?.split('.').pop()?.toLowerCase();
    const normalizedMimeType = mimeType?.toLowerCase();

    if (normalizedMimeType === 'application/pdf' || extension === 'pdf') {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      await parser.destroy();
      return this.limitText(result.text);
    }

    if (
      normalizedMimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === 'docx'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return this.limitText(result.value);
    }

    if (
      normalizedMimeType ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      normalizedMimeType === 'application/vnd.ms-excel' ||
      extension === 'xlsx' ||
      extension === 'xls' ||
      extension === 'csv'
    ) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const text = workbook.SheetNames.map((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
      }).join('\n\n');
      return this.limitText(text);
    }

    if (
      normalizedMimeType?.startsWith('text/') ||
      extension === 'txt' ||
      extension === 'md' ||
      extension === 'json'
    ) {
      return this.limitText(buffer.toString('utf8'));
    }

    throw new Error(
      `Unsupported document type: ${mimeType || extension || 'unknown'}`,
    );
  }

  private limitText(text: string): string {
    const normalizedText = text.trim();
    if (normalizedText.length <= MAX_EXTRACTED_CHARACTERS) {
      return normalizedText;
    }

    return `${normalizedText.slice(0, MAX_EXTRACTED_CHARACTERS)}\n\n[Document text truncated]`;
  }
}
