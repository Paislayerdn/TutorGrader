import { Principal } from "./Principal";
import { UserData } from "./UserData";
import { UserDTO } from "./UserDTO";
import type { Admin } from "./Admin";

export class User extends Principal {
	constructor(
		public id: string,
		public data: UserData,
		public createdById: string,
		public createdBy: Admin | null
	) {
		super();
	}

	public get username(): string { return this.data.username; }
	public get registeredName(): string { return this.data.registeredName; }
	public get status() { return this.data.status; }
	public get createdAt(): Date { return this.data.createdAt; }
	public get role(): "USER" | "ADMIN" | "OWNER" { return "USER"; }

	public toDTO(creatorName: string): UserDTO {
		return new UserDTO(this.data, this.role, creatorName);
	}
}
