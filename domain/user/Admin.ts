import { User } from "./User";
import { UserData } from "./UserData";

export class Admin extends User {
	constructor(
		id: string,
		data: UserData,
		createdById: string,
		createdBy: Admin | null
	) {
		super(id, data, createdById, createdBy);
	}

	public override get role(): "USER" | "ADMIN" | "OWNER" { return "ADMIN"; }
}
