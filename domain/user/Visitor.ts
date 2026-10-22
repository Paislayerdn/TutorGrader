import type { Problem } from "@/domain/problem/Problem";
import type { Role } from "./Role";

export class Visitor {
	public get isAuthenticated(): boolean { return false; }

	public canViewProblem(_problem: Problem): boolean { void _problem; return false; }
	public canDownloadProblem(_problem: Problem): boolean { void _problem; return false; }
	public canSubmitTo(_problem: Problem): boolean { void _problem; return false; }
	public canReadSourceOf(_ownerUserId: string): boolean { void _ownerUserId; return false; }
	public get canManageProblems(): boolean { return false; }
	public get canCreateAccounts(): boolean { return this.creatableRoles.length > 0; }
	public get userId(): string | null { return null; }
	public canCreateAccountWithRole(_role: Role): boolean { void _role; return false; }
	public get canRunGarbageCollection(): boolean { return false; }
	public get canViewQueryHistory(): boolean { return false; }
	public get creatableRoles(): Role[] { return []; }
}
