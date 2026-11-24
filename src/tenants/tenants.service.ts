import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Tenant, TenantDocument } from './schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async resolveByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<TenantDocument | null> {
    return this.tenantModel
      .findOne({ phoneNumberId, status: 'active' })
      .exec();
  }

  async ensureDefaultTenant(): Promise<TenantDocument | null> {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      return null;
    }

    const existing = await this.resolveByPhoneNumberId(phoneNumberId);
    if (existing) {
      return existing;
    }

    return this.tenantModel.findOneAndUpdate(
      { phoneNumberId },
      {
        $set: { status: 'active' },
        $setOnInsert: {
          tenantId: `tenant-${randomUUID()}`,
          name: 'Default Tenant',
          phoneNumberId,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    ).exec();
  }
}
