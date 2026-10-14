import { supabaseAdmin } from "@/lib/supabase-admin";

import { Admin } from "./Admin";
import { Owner } from "./Owner";
import { User } from "./User";
import { UserData } from "./UserData";
import { UserStatus } from "./UserStatus";
import { Role } from "./Role";

type UserRow = {
	id: string;
	username: string;
	registered_name: string;
	status: "ACTIVE" | "BANNED" | "INACTIVE";
	role: Role;
	created_by: string;
	created_at: string;
	password_changed_at: string | null;
	creator_username: string | null;
	creator_registered_name: string | null;
};

export class UserRepository {
	async findById(id: string): Promise<User | null> {
		const { data, error } = await supabaseAdmin
			.from("app_user_view")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) {
			console.error("User lookup error:", error);
			throw new Error("Unable to load user.");
		}

		if (!data) { return null; }

		return this.createUser(data as UserRow);
	}

	private createUser(row: UserRow): User {
		const data = new UserData(
			row.registered_name,
			row.username,
			row.status as UserStatus,
			new Date(row.created_at),
			row.password_changed_at
				? new Date(row.password_changed_at)
				: null,
		);

		switch (row.role) {
			case "OWNER": return new Owner( row.id, data, row.created_by, );
			case "ADMIN": return new Admin( row.id, data, row.created_by, );
			case "USER": return new User( row.id, data, row.created_by, );
		}
	}
}
