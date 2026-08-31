import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
	constructor(
		@InjectModel(User.name)
		private readonly userModel: Model<UserDocument>,
	) {}

	async findOrCreate(phoneNumber: string, name?: string): Promise<UserDocument> {
		const update = name ? { name } : {};

		return this.userModel.findOneAndUpdate(
			{ phoneNumber },
			{ $set: update, $setOnInsert: { phoneNumber } },
			{ new: true, upsert: true, setDefaultsOnInsert: true },
		).exec();
	}
}
