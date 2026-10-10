import { Admin } from "./Admin";
import type { UserData } from "./User";

export class Owner extends Admin {
	constructor(data: UserData) {
		super({ ...data, createdBy: null });
		this.setCreator(this);
	}

	public override get role(): "USER" | "ADMIN" | "OWNER" { return "OWNER"; }
}
