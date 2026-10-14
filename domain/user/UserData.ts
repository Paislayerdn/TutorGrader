import { UserStatus } from "./UserStatus";

export class UserData {
	constructor(
		public registeredName: string,
		public username: string,
		public status: UserStatus,
		public createdAt: Date,
		public passwordChangedAt: Date | null,
	) {}
}
