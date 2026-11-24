import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantDocument = HydratedDocument<Tenant>;
export type TenantStatus = 'active' | 'suspended';

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true, index: true })
  tenantId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ trim: true, maxlength: 120 })
  category?: string;

  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  @Prop({ trim: true, maxlength: 100 })
  timezone?: string;

  @Prop({ lowercase: true, trim: true, index: true })
  ownerEmail?: string;

  @Prop({ unique: true, sparse: true, index: true })
  phoneNumberId?: string;

  @Prop({ enum: ['active', 'suspended'], default: 'active', index: true })
  status!: TenantStatus;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
