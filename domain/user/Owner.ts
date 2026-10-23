import { Role } from "./Role";
import { Admin } from "./Admin";

export class Owner extends Admin {
	public override canCreateAccountWithRole(role: Role): boolean {
		return role === Role.USER || role === Role.ADMIN;
	}
	public override get creatableRoles(): Role[] { return [Role.USER, Role.ADMIN]; }

	public override get canRunGarbageCollection(): boolean { return true; }
	public override get canViewQueryHistory(): boolean { return true; }
	public override get role(): Role { return Role.OWNER; }
}
