import { User } from "./User";
import { UserData } from "./UserData";
import { Role } from "./Role";

export class Admin extends User {
	constructor(
		id: string,
		data: UserData,
		createdById: string,
	) {
		super(id, data, createdById);
	}

	public override get role(): Role { return "ADMIN"; }
}
