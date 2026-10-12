import { UserData } from "./UserData";

export class UserDTO extends UserData {
	constructor(
		data: UserData,
		public role: "USER" | "ADMIN" | "OWNER",
		public creatorName: string
	) {
		super(
			data.registeredName,
			data.username,
			data.status,
			data.createdAt
		);
	}
}
