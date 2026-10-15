import { Role } from "./Role";
import { Admin } from "./Admin";

export class Owner extends Admin {
	public override canCreateAccountWithRole(role: Role): boolean {
		return role === "USER" || role === "ADMIN";
	}

	public override get canRunGarbageCollection(): boolean { return true; }
	public override get role(): Role { return "OWNER"; }
}
