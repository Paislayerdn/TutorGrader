import { supabaseAdmin } from "@/lib/supabase-admin";

import { Admin } from "./Admin";
import { Owner } from "./Owner";
import { User } from "./User";
import { UserData } from "./UserData";
import { UserDTO } from "./UserDTO";
import { UserStatus } from "./UserStatus";

type UserRow = {
	id: string;
	username: string;
	registered_name: string;
	status: "ACTIVE" | "BANNED" | "INACTIVE";
	role: "USER" | "ADMIN" | "OWNER";
	created_by: string;
	created_at: string;
	password_changed_at: string | null;
	creator_username: string;
	creator_registered_name: string;
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

		if (!data) return null;

		return this.createUser(data as UserRow);
	}

	async findByIdWithCreator(id: string): Promise<User | null> {
		const user = await this.findById(id);
		if (!user) return null;

		if (user instanceof Owner && user.createdById === user.id) {
			user.createdBy = user;
			return user;
		}

		const creator = await this.findById(user.createdById);

		if (!(creator instanceof Admin)) {
			throw new Error("User creator must be an Admin or Owner.");
		}

		user.createdBy = creator;
		return user;
	}
	async findDTOById(id: string): Promise<UserDTO | null> {
		const { data, error } = await supabaseAdmin
			.from("app_user_view")
			.select("*")
			.eq("id", id)
			.maybeSingle();

		if (error) {
			console.error("User lookup error:", error);
			throw new Error("Unable to load user.");
		}

		if (!data) return null;

		const row = data as UserRow;
		const user = this.createUser(row);

		const creatorName =
			row.creator_username || row.creator_registered_name;

		return user.toDTO(creatorName);
	}

	private createUser(row: UserRow): User {
		const data = new UserData(
			row.registered_name,
			row.username,
			row.status as UserStatus,
			new Date(row.created_at)
		);

		switch (row.role) {
			case "OWNER":
				return new Owner(row.id, data, row.created_by);

			case "ADMIN":
				return new Admin(row.id, data, row.created_by, null);

			case "USER":
				return new User(row.id, data, row.created_by, null);
		}
	}
}
