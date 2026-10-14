import { Visitor } from "./Visitor";
import { UserData } from "./UserData";
import { Role } from "./Role";

export class User extends Visitor {
	constructor(
		public id: string,
		public data: UserData,
		public createdById: string,
	) {
		super();
	}

	public override get isAuthenticated(): boolean { return true; }
	public get username(): string { return this.data.username; }
	public get registeredName(): string { return this.data.registeredName; }
	public get status(): string { return this.data.status; }
	public get createdAt(): Date { return this.data.createdAt; }
	public get passwordChangedAt(): Date | null { return this.data.passwordChangedAt; }
	public get role(): Role { return "USER"; }
}
