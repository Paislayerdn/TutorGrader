import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/http";
import { UserRepo, UserRepoError } from "@/data/supabase/repositories/UserRepo";
import { Username } from "@/domain/user/Username";

const userRepo = new UserRepo();

export async function handleUsername(body: {
	username?: string;
}) {
	const user = await requireApiUser();

	const rawUsername = body.username;

	if (!rawUsername?.trim()) {
		return NextResponse.json(
			{ error: "Username is required." },
			{ status: 400 }
		);
	}
	const username = Username.parse(rawUsername);
	if (!username) {
		return NextResponse.json(
			{ error: "Username must be 3–30 characters and use only English letters, numbers, and underscores." },
			{ status: 400 },
		);
	}

	if (username.value === user.username) {
		return NextResponse.json(
			{ error: "New username must be different from the current username." },
			{ status: 400 }
		);
	}

	let data: unknown;
	try {
		data = await userRepo.changeUsername(user.id, username.value);
	} catch (error) {
		if (error instanceof UserRepoError && error.code === "23505") {
			return NextResponse.json(
				{ error: "That username is already in use." },
				{ status: 409 }
			);
		}

		return NextResponse.json({ error: "Unable to change username." }, { status: 500 });
	}

	return NextResponse.json({
		user: data,
	});
}
