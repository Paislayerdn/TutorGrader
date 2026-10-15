import { Role } from "./Role";
import { User } from "./User";

export class Admin extends User {
	public override canViewProblem(): boolean { return true; }
	public override canDownloadProblem(): boolean { return true; }
	public override get canManageProblems(): boolean { return true; }
	public override canCreateAccountWithRole(role: Role): boolean {
		return role === "USER";
	}

	public override get role(): Role { return "ADMIN"; }
}
