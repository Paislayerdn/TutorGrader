import { Problem } from "@/domain/problem/Problem";
import { ProblemStatus } from "@/domain/problem/ProblemStatus";
import { Visitor } from "./Visitor";
import { UserData } from "./UserData";
import { UserStatus } from "./UserStatus";
import { Role } from "./Role";

export class User extends Visitor {
	constructor(
		public readonly id: string,
		public readonly data: UserData,
		public createdById: string,
	) {
		super();
	}

	public override get isAuthenticated(): boolean { return true; }
	public override canViewProblem(problem: Problem): boolean {
		return problem.isPublished && problem.status !== ProblemStatus.INACTIVE;
	}
	public override canDownloadProblem(problem: Problem): boolean {
		return this.canViewProblem(problem) && problem.status === ProblemStatus.ACTIVE;
	}
	public override canSubmitTo(problem: Problem): boolean { return problem.isSubmittable; }
	public override canReadSourceOf(ownerUserId: string): boolean {
		return ownerUserId === this.id;
	}
	public get username(): string { return this.data.username; }
	public override get userId(): string { return this.id; }
	public get registeredName(): string { return this.data.registeredName; }
	public get status(): UserStatus { return this.data.status; }
	public get createdAt(): Date { return this.data.createdAt; }
	public get passwordChangedAt(): Date | null { return this.data.passwordChangedAt; }
	public get role(): Role { return Role.USER; }
}
