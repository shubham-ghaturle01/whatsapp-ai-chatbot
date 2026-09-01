// import {
//   Injectable,
//   InternalServerErrorException,
// } from '@nestjs/common';

// import axios from 'axios';

// @Injectable()
// export class WhatsappService {
//   async sendMessage(
//     phoneNumber: string,
//     message: string,
//   ): Promise<any> {
//     const accessToken =
//       process.env.WHATSAPP_ACCESS_TOKEN;

//     const phoneNumberId =
//       process.env.WHATSAPP_PHONE_NUMBER_ID;

//     const apiVersion =
//       process.env.WHATSAPP_API_VERSION;

//     if (!accessToken || !phoneNumberId || !apiVersion) {
//       throw new InternalServerErrorException(
//         'WhatsApp environment variables are missing',
//       );
//     }

//     const url =
//       `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

//     try {
//       const response = await axios.post(
//         url,
//         {
//           messaging_product: 'whatsapp',
//           recipient_type: 'individual',
//           to: phoneNumber,
//           type: 'text',
//           text: {
//             preview_url: false,
//             body: message,
//           },
//         },
//         {
//           headers: {
//             Authorization: `Bearer ${accessToken}`,
//             'Content-Type': 'application/json',
//           },
//         },
//       );

//       console.log(
//         'WhatsApp message sent:',
//         response.data,
//       );

//       return response.data;
//     } catch (error: any) {
//       console.error(
//         'WhatsApp API Error:',
//         error?.response?.data || error.message,
//       );

//       throw new InternalServerErrorException(
//         'Failed to send WhatsApp message',
//       );
//     }
//   }
// }
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly maxTextLength = 4096;

  constructor(private readonly configService: ConfigService) {}

  private get apiConfig() {
    const phoneNumberId = this.configService.getOrThrow<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
    );
    const accessToken = this.configService.getOrThrow<string>(
      'WHATSAPP_ACCESS_TOKEN',
    );
    const graphApiVersion = this.configService.getOrThrow<string>(
      'GRAPH_API_VERSION',
    );

    return {
      accessToken,
      graphApiVersion,
      phoneNumberId,
      url: `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private logApiError(operation: string, error: unknown) {
    const apiError = error as {
      response?: { status?: number; data?: unknown };
      message?: string;
    };

    this.logger.error(`${operation} API ERROR`, {
      status: apiError.response?.status,
      data: apiError.response?.data,
      message: apiError.message,
    });
  }

  async markAsRead(messageId: string) {

    const { url, headers, graphApiVersion, phoneNumberId } = this.apiConfig;

    this.logger.log('MARK READ START');
    this.logger.log(`MESSAGE ID: ${messageId}`);
    this.logger.log(`PHONE NUMBER ID: ${phoneNumberId}`);
    this.logger.log(`GRAPH API VERSION: ${graphApiVersion}`);
    this.logger.log(`ACCESS TOKEN EXISTS: ${Boolean(headers.Authorization)}`);
    this.logger.log(`OUTGOING URL: ${url}`);

    try {

      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers,
        },
      );

      this.logger.log(`MARK READ RESPONSE: ${JSON.stringify(response.data)}`);
      return response.data;

    } catch (error: any) {

      this.logApiError('MARK READ', error);
      throw error;
    }
  }

  async sendText(to: string, text: string) {

    const { url, headers, graphApiVersion, phoneNumberId } = this.apiConfig;

    this.logger.log('SEND MESSAGE START');
    this.logger.log(`TO: ${to}`);
    this.logger.log(`TEXT: ${text}`);
    this.logger.log(`PHONE NUMBER ID: ${phoneNumberId}`);
    this.logger.log(`GRAPH API VERSION: ${graphApiVersion}`);
    this.logger.log(`ACCESS TOKEN EXISTS: ${Boolean(headers.Authorization)}`);
    this.logger.log(`OUTGOING URL: ${url}`);

    try {

      const chunks = this.splitText(text);
      const responses: unknown[] = [];
      for (const chunk of chunks) {
        const response = await axios.post(
          url,
          {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to,
            type: 'text',
            text: {
              preview_url: false,
              body: chunk,
            },
          },
          { headers },
        );
        responses.push(response.data);
      }

      this.logger.log(`SEND MESSAGE RESPONSE: ${JSON.stringify(responses)}`);
      return responses.length === 1 ? responses[0] : responses;

    } catch (error: any) {

      this.logApiError('SEND MESSAGE', error);
      throw error;
    }
  }

  private splitText(text: string): string[] {
    if (text.length <= this.maxTextLength) {
      return [text];
    }

    const chunks: string[] = [];
    for (let index = 0; index < text.length; index += this.maxTextLength) {
      chunks.push(text.slice(index, index + this.maxTextLength));
    }
    return chunks;
  }

  async downloadMedia(mediaId: string): Promise<{ data: Buffer; mimeType?: string }> {
    const { headers } = this.apiConfig;
    const metadataResponse = await axios.get(
      `https://graph.facebook.com/${this.apiConfig.graphApiVersion}/${mediaId}`,
      { headers },
    );
    const mediaResponse = await axios.get<ArrayBuffer>(metadataResponse.data.url, {
      headers,
      responseType: 'arraybuffer',
    });

    return {
      data: Buffer.from(mediaResponse.data),
      mimeType: metadataResponse.data.mime_type,
    };
  }
}