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

	if (username === user.username) {
		return NextResponse.json(
			{ error: "New username must be different from the current username." },
			{ status: 400 }
		);
	}
	if (!username) {
		return NextResponse.json(
			{ error: "Username is required." },
			{ status: 400 }
		);
	}

	const { data, error } = await supabaseAdmin.rpc(
		"change_username_with_history",
		{
			p_user_id: user.id,
			p_username: username,
		}
	);

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

	return NextResponse.json({
		user: data,
	});
}
