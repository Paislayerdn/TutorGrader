import { NextResponse } from "next/server";

import { UserRepo } from "@/data/supabase/repositories/UserRepo";
import { PasswordHasher } from "@/data/security/PasswordHasher";
import { PASSWORD_MAX_LENGTH } from "@/domain/user/Password";
import { readJsonObject } from "@/lib/http";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";
const userRepo = new UserRepo();
const passwordHasher = new PasswordHasher();
// TODO: Add a Vercel Firewall rate-limit rule for login attempts.

export async function POST(request: Request) {
	let body: Record<string, unknown>;

	try {
		body = await readJsonObject(request);
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		);
	}

	try {
		const username =
			typeof body.username === "string"
				? body.username.trim()
				: "";

		const password =
			typeof body.password === "string"
				? body.password
				: "";

		if (!username || !password) {
			return NextResponse.json(
				{ error: "Username and password are required." },
				{ status: 400 }
			);
		}
		if (!/^[A-Za-z0-9_]+$/.test(username)) {
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 },
			);
		}

		const user = await userRepo.findCredentialsByUsername(username);

		if (!user) {
			if (password.length <= PASSWORD_MAX_LENGTH) {
				await passwordHasher.verifyDummy(password);
			}
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 }
			);
		}

		if (password.length > PASSWORD_MAX_LENGTH) {
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 },
			);
		}

		const validPassword = await passwordHasher.verify(user.passwordHash, password);

		if (!validPassword) {
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 }
			);
		}

		if (user.status !== "ACTIVE") {
			return NextResponse.json(
				{ error: "This account is not active." },
				{ status: 403 },
			);
		}

		await createSession(user.id);

		return NextResponse.json({
			success: true,
		});
	} catch (error) {
		console.error("Login error:", error);

		return NextResponse.json(
			{ error: "Unable to sign in." },
			{ status: 500 }
		);
	}
}
