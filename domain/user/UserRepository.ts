import { supabaseAdmin } from "@/lib/supabase-admin";

import { Admin } from "./Admin";
import { Owner } from "./Owner";
import { User, type UserData } from "./User";
import { UserStatus } from "./UserStatus";

type UserRow = {
	id: string;
	username: string;
	registered_name: string;
	password_hash: string;
	created_at: string;
	created_by: string;
	role: "USER" | "ADMIN" | "OWNER";
	status: "ACTIVE" | "BANNED" | "INACTIVE";
};

export class UserRepository {
	private static readonly USER_COLUMNS = "id, username, registered_name, password_hash, created_at, created_by, role, status";

	async findById(id: string): Promise<User | null> {
		const { data, error } = await supabaseAdmin
			.from("app_user")
			.select(UserRepository.USER_COLUMNS)
			.eq("id", id)
			.maybeSingle();

		if (error) {
			console.error("User lookup error:", error);
			throw new Error("Unable to load user.");
		}

		if (!data) return null;

		return this.createUser(data as UserRow, null);
	}

	async findByIdWithCreator(id: string): Promise<User | null> {
		const user = await this.findById(id);
		if (!user) return null;

		// The root Owner is their own creator.
		if (user instanceof Owner && user.createdById === user.id) {
			return user;
		}

		const { data, error } = await supabaseAdmin
			.from("app_user")
			.select(UserRepository.USER_COLUMNS)
			.eq("id", user.createdById)
			.maybeSingle();

		if (error) {
			console.error("Creator lookup error:", error);
			throw new Error("Unable to load user creator.");
		}

		if (!data) throw new Error("User creator was not found.");

		const creator = this.createUser(data as UserRow, null);

		if (!(creator instanceof Admin)) {
			throw new Error("User creator must be an Admin or Owner.");
		}

		user.setCreator(creator);
		return user;
	}

	private createUser(row: UserRow, creator: Admin | null): User {
		const data: UserData = {
			id: row.id,
			username: row.username,
			registeredName: row.registered_name,
			passwordHash: row.password_hash,
			createdAt: new Date(row.created_at),
			createdById: row.created_by,
			createdBy: creator,
			status: row.status as UserStatus,
		};

		switch (row.role) {
			case "OWNER": return new Owner(data);
			case "ADMIN": return new Admin(data);
			case "USER": return new User(data);
			default: throw new Error(`Unknown user role: ${row.role}`);
		}
	}
}
