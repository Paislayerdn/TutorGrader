import { supabaseAdmin } from "@/data/supabase/supabase-admin";

import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import { User } from "@/domain/user/User";
import { UserData } from "@/domain/user/UserData";
import { UserStatus } from "@/domain/user/UserStatus";
import { Role } from "@/domain/user/Role";

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

export class UserRepoError extends Error {
	constructor(message: string, public readonly code?: string) {
		super(message);
	}
}

export class UserRepo {
	async searchForQueryHistory(query: string): Promise<{
		user: { id: string; username: string; registered_name: string } | null;
		ambiguousRegisteredName: boolean;
	}> {
		const pattern = query.replace(/[\\%_]/g, "\\$&");
		const { data: usernames, error: usernameError } = await supabaseAdmin.from("app_user")
			.select("id, username, registered_name").ilike("username", pattern).limit(2);
		if (usernameError) throw new Error("Unable to search for the account.");
		if (usernames?.length === 1) return { user: usernames[0], ambiguousRegisteredName: false };
		if (usernames && usernames.length > 1) return { user: null, ambiguousRegisteredName: false };
		const { data: names, error: nameError } = await supabaseAdmin.from("app_user")
			.select("id, username, registered_name").ilike("registered_name", pattern).limit(2);
		if (nameError) throw new Error("Unable to search for the account.");
		if (names?.length === 1) return { user: names[0], ambiguousRegisteredName: false };
		return { user: null, ambiguousRegisteredName: Boolean(names && names.length > 1) };
	}
	async createAccount(input: {
		id: string;
		username: string;
		registeredName: string;
		passwordHash: string;
		role: Role;
		createdById: string;
	}): Promise<Record<string, unknown>> {
		const { data, error } = await supabaseAdmin
			.from("app_user")
			.insert({
				id: input.id,
				username: input.username,
				registered_name: input.registeredName,
				password_hash: input.passwordHash,
				role: input.role,
				status: "ACTIVE",
				created_by: input.createdById,
			})
			.select("id, username, registered_name, role, status")
			.single();
		if (error) {
			console.error("Account creation error:", error);
			if (error.code === "23505") throw new UserRepoError("That username is already in use.", error.code);
			throw new UserRepoError("Unable to create account.");
		}
		return data as Record<string, unknown>;
	}

	async changeUsername(userId: string, username: string): Promise<unknown> {
		const { data, error } = await supabaseAdmin.rpc("change_username_with_history", {
			p_user_id: userId,
			p_username: username,
		});
		if (error) {
			console.error("Username update error:", error);
			if (error.code === "23505") throw new UserRepoError("That username is already in use.", error.code);
			throw new UserRepoError("Unable to change username.");
		}
		return data;
	}

	async findPasswordHash(userId: string): Promise<string | null> {
		const { data, error } = await supabaseAdmin
			.from("app_user")
			.select("password_hash")
			.eq("id", userId)
			.maybeSingle();
		if (error) {
			console.error("Password lookup error:", error);
			throw new UserRepoError("Unable to find account.");
		}
		return data?.password_hash ?? null;
	}

	async changePassword(userId: string, passwordHash: string): Promise<void> {
		const { error } = await supabaseAdmin.rpc("change_password_with_history", {
			p_user_id: userId,
			p_password_hash: passwordHash,
		});
		if (error) {
			console.error("Password update error:", error);
			throw new UserRepoError("Unable to change password.");
		}
	}

	async deactivate(userId: string): Promise<void> {
		const { error } = await supabaseAdmin
			.from("app_user")
			.update({ status: "INACTIVE" })
			.eq("id", userId);
		if (error) {
			console.error("Account deactivation error:", error);
			throw new UserRepoError("Unable to deactivate account.");
		}
	}

	async findPasswordChangedAt(id: string): Promise<Date | null> {
		const { data, error } = await supabaseAdmin
			.from("app_user")
			.select("password_changed_at")
			.eq("id", id)
			.maybeSingle();
		if (error) {
			console.error("Password timestamp lookup error:", error);
			throw new Error("Unable to load password timestamp.");
		}
		return data?.password_changed_at
			? new Date(data.password_changed_at)
			: null;
	}

	async findCredentialsByUsername(username: string): Promise<{
		id: string;
		passwordHash: string;
		status: "ACTIVE" | "BANNED" | "INACTIVE";
	} | null> {
		const { data, error } = await supabaseAdmin
			.from("app_user")
			.select("id, password_hash, status")
			.ilike("username", username.replace(/_/g, "\\_"))
			.maybeSingle();

		if (error) {
			console.error("Login database error:", error);
			throw new Error("Unable to sign in.");
		}
		if (!data) return null;
		return {
			id: data.id,
			passwordHash: data.password_hash,
			status: data.status,
		};
	}

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
