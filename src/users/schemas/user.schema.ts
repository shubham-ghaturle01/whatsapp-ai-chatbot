import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
})
export class User {
  createdAt!: Date;
  updatedAt!: Date;

  @Prop({
    required: true,
    index: true,
  })
  tenantId!: string;

  @Prop({
    required: true,
    index: true,
  })
  phoneNumber!: string;

  @Prop()
  name?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ tenantId: 1, phoneNumber: 1 }, { unique: true });