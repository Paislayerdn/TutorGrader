import { NextResponse } from "next/server";
import argon2 from "argon2";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
	let body: Record<string, unknown>;

	try {
		const parsed: unknown = await request.json();

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return NextResponse.json(
				{ error: "Invalid request body." },
				{ status: 400 },
			);
		}

		body = parsed as Record<string, unknown>;
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

		const { data: user, error } = await supabaseAdmin
			.from("app_user")
			.select("id, password_hash, status")
			.ilike("username", username.replace(/_/g, "\\_"))
			.maybeSingle();

		if (error) {
			console.error("Login database error:", error);

			return NextResponse.json(
				{ error: "Unable to sign in." },
				{ status: 500 }
			);
		}

		if (!user) {
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 }
			);
		}

		if (user.status !== "ACTIVE") {
			return NextResponse.json(
				{ error: "This account is not active." },
				{ status: 403 }
			);
		}

		const validPassword = await argon2.verify(
			user.password_hash,
			password
		);

		if (!validPassword) {
			return NextResponse.json(
				{ error: "Invalid username or password." },
				{ status: 401 }
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
