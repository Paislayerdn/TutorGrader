import { NextResponse } from "next/server";
import argon2 from "argon2";

import { supabaseAdmin } from "@/data/supabase/supabase-admin";
import { requireApiAdmin, route } from "@/lib/http";

export const runtime = "nodejs";

export const POST = route(async (request: Request) => {
	const currentUser = await requireApiAdmin();

	let body: Record<string, unknown>;

	try {
		const parsed: unknown = await request.json();

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			throw new Error("Invalid request body.");
		}

		body = parsed as Record<string, unknown>;
	} catch {
		return NextResponse.json(
			{ error: "Invalid request body." },
			{ status: 400 },
		);
	}

	const username =
		typeof body.username === "string"
			? body.username.trim()
			: "";

	const registeredName =
		typeof body.registeredName === "string"
			? body.registeredName.trim()
			: "";

	const password =
		typeof body.password === "string"
			? body.password
			: "";

	const requestedRole = body.role;
	
	if (!/^[A-Za-z0-9_]+$/.test(username)) {
		return NextResponse.json(
			{ error: "Username may contain only English letters, numbers, and underscores." },
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
			created_by: currentUser.id,
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

	return NextResponse.json({ user: data }, { status: 201 });
});
