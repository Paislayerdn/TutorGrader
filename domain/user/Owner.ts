import { Admin } from "./Admin";
import { UserData } from "./UserData";
import { Role } from "./Role";

export class Owner extends Admin {
	constructor(
		id: string,
		data: UserData,
		createdById: string,
	) {
		super(id, data, createdById);
	}

	public override get role(): Role { return "OWNER"; }
}
