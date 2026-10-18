import { Problem } from "@/domain/problem/Problem";
import { Role } from "./Role";

export class Visitor {
	public get isAuthenticated(): boolean { return false; }

	public canViewProblem(_problem: Problem): boolean { return false; }
	public canDownloadProblem(_problem: Problem): boolean { return false; }
	public canReadSourceOf(_ownerUserId: string): boolean { return false; }
	public get canManageProblems(): boolean { return false; }
	public canCreateAccountWithRole(_role: Role): boolean { return false; }
	public get canRunGarbageCollection(): boolean { return false; }
	public get canViewQueryHistory(): boolean { return false; }
	public get creatableRoles(): Role[] { return []; }
}
