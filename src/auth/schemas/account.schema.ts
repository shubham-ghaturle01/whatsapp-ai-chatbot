import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AccountDocument = HydratedDocument<Account>;
export type UserRole = 'SUPER_ADMIN' | 'BUSINESS_ADMIN' | 'BUSINESS_AGENT';

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true, index: true })
  tenantId!: string;

  @Prop({ required: true, lowercase: true, trim: true, unique: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({
    enum: ['SUPER_ADMIN', 'BUSINESS_ADMIN', 'BUSINESS_AGENT'],
    required: true,
  })
  role!: UserRole;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
