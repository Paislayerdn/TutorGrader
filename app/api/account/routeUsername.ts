import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function handleUsername(body: {
	username?: string;
}) {
	const user = await getCurrentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 }
		);
	}

	const username = body.username?.trim();

	if (!username) {
		return NextResponse.json(
			{ error: "Username is required." },
			{ status: 400 }
		);
	}

	const { data, error } = await supabaseAdmin
		.from("app_user")
		.update({
			username,
		})
		.eq("id", user.id)
		.select("id, username, registered_name, role, status")
		.single();

	if (error) {
		console.error("Username update error:", error);

		if (error.code === "23505") {
			return NextResponse.json(
				{ error: "That username is already in use." },
				{ status: 409 }
			);
		}

		return NextResponse.json(
			{ error: "Unable to change username." },
			{ status: 500 }
		);
	}

	return NextResponse.json({
		user: data,
	});
}
