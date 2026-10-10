	import { Principal } from "./Principal";
import { UserStatus } from "./UserStatus";
import type { Admin } from "./Admin";

export type UserData = {
	id: string;
	username: string;
	registeredName: string;
	passwordHash: string;
	createdAt: Date;
	createdById: string;
	createdBy: Admin | null;
	status: UserStatus;
};

export class User extends Principal {
	private readonly _id: string;
	private _username: string;
	private readonly _registeredName: string;
	private _passwordHash: string;
	private readonly _createdAt: Date;
	private readonly _createdById: string;
	private _createdBy: Admin | null;
	private _status: UserStatus;

	constructor(data: UserData) {
		super();

		this._id = data.id;
		this._username = data.username;
		this._registeredName = data.registeredName;
		this._passwordHash = data.passwordHash;
		this._createdAt = data.createdAt;
		this._createdById = data.createdById;
		this._createdBy = data.createdBy;
		this._status = data.status;
	}

	public get id(): string { return this._id; }
	public get username(): string { return this._username; }
	public get registeredName(): string { return this._registeredName; }
	public get createdAt(): Date { return new Date(this._createdAt); }
	public get createdById(): string { return this._createdById; }
	public get createdBy(): Admin | null { return this._createdBy; }
	public get status(): UserStatus { return this._status; }
	public get role(): "USER" | "ADMIN" | "OWNER" { return "USER"; }

	public setCreator(creator: Admin): void {
		if (this._createdBy !== null) throw new Error("Creator has already been assigned.");
		this._createdBy = creator;
	}

	public changeUsername(username: string): void {
		this._username = username;
	}

	public changeStatus(status: UserStatus): void {
		this._status = status;
	}
}
