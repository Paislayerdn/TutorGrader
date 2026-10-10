import { User } from "./User";
import type { UserData } from "./User";

export class Admin extends User {
	constructor(data: UserData) {
		super(data);
	}

	public override get role(): "USER" | "ADMIN" | "OWNER" { return "ADMIN"; }
}
