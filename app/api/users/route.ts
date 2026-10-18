import { NextResponse } from "next/server";
import { UserRepo, UserRepoError } from "@/data/supabase/repositories/UserRepo";
import { readJsonObject, requireApiAdmin, route } from "@/lib/http";
import { Username } from "@/domain/user/Username";
import { Password } from "@/domain/user/Password";
import { PasswordHasher } from "@/data/security/PasswordHasher";

export const runtime = "nodejs";
const passwordHasher = new PasswordHasher();
const userRepo = new UserRepo();

export const POST = route(async (request: Request) => {
	const currentUser = await requireApiAdmin();

	const body = await readJsonObject(
		request,
		"Invalid request body.",
		"Invalid request body.",
	);

	const username = Username.parse(body.username);

	const registeredName =
		typeof body.registeredName === "string"
			? body.registeredName.trim()
			: "";

	const password =
		typeof body.password === "string"
			? body.password
			: "";

	const requestedRole = body.role;
	
	if (!username) {
		return NextResponse.json(
			{ error: "Username must be 3–30 characters and use only English letters, numbers, and underscores." },
			{ status: 400 },
		);
	}

	if (!username || !registeredName || !password) {
		return NextResponse.json(
			{ error: "All fields are required." },
			{ status: 400 }
		);
	}

	if (requestedRole !== "USER" && requestedRole !== "ADMIN") {
		return NextResponse.json(
			{ error: "Invalid account role." },
			{ status: 400 }
		);
	}

	if (!currentUser.canCreateAccountWithRole(requestedRole)) {
		return NextResponse.json(
			{ error: "You do not have permission to create this account role." },
			{ status: 403 },
		);
	}

	const parsedPassword = Password.parseNew(password);
	if (!parsedPassword) {
		return NextResponse.json(
			{ error: "Password must be between 8 and 128 characters." },
			{ status: 400 },
		);
	}

	const passwordHash = await passwordHasher.hash(parsedPassword.value);

	try {
		const data = await userRepo.createAccount({
			id: crypto.randomUUID(),
			username: username.value,
			registeredName,
			passwordHash,
			role: requestedRole,
			createdById: currentUser.id,
		});
		return NextResponse.json({ user: data }, { status: 201 });
	} catch (error) {
		if (error instanceof UserRepoError && error.code === "23505") {
			return NextResponse.json(
				{ error: "That username is already in use." },
				{ status: 409 }
			);
		}

		return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
	}
});
