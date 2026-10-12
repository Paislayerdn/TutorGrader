import { Admin } from "./Admin";
import { UserData } from "./UserData";

export class Owner extends Admin {
	constructor(
		id: string,
		data: UserData,
		createdById: string
	) {
		super(id, data, createdById, null);
		this.createdBy = this;
	}

	public override get role(): "USER" | "ADMIN" | "OWNER" { return "OWNER"; }
}
