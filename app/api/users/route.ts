import { NextResponse } from "next/server";
import argon2 from "argon2";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
	const currentUser = await getCurrentUser();

	if (!currentUser) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 }
		);
	}

	if (currentUser.role !== "ADMIN" && currentUser.role !== "OWNER") {
		return NextResponse.json(
			{ error: "You do not have permission to create accounts." },
			{ status: 403 }
		);
	}

	const body = await request.json();

	const username = body.username?.trim();
	const registeredName = body.registeredName?.trim();
	const password = body.password;
	const requestedRole = body.role;

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

	if (currentUser.role === "ADMIN" && requestedRole !== "USER") {
		return NextResponse.json(
			{ error: "Admins can only create USER accounts." },
			{ status: 403 }
		);
	}

	const passwordHash = await argon2.hash(password);

	const { data, error } = await supabaseAdmin
		.from("app_user")
		.insert({
			id: crypto.randomUUID(),
			username,
			registered_name: registeredName,
			password_hash: passwordHash,
			role: requestedRole,
			status: "ACTIVE",
		})
		.select("id, username, registered_name, role, status")
		.single();

	if (error) {
		console.error("Account creation error:", error);

		if (error.code === "23505") {
			return NextResponse.json(
				{ error: "That username is already in use." },
				{ status: 409 }
			);
		}

		return NextResponse.json(
			{ error: "Unable to create account." },
			{ status: 500 }
		);
	}

	return NextResponse.json(
		{ user: data },
		{ status: 201 }
	);
}
