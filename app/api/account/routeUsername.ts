import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/http";
import { supabaseAdmin } from "@/data/supabase/supabase-admin";

export async function handleUsername(body: {
	username?: string;
}) {
	const user = await requireApiUser();

	const username = body.username?.trim();

	if (!username) {
		return NextResponse.json(
			{ error: "Username is required." },
			{ status: 400 }
		);
	}

	if (username === user.username) {
		return NextResponse.json(
			{ error: "New username must be different from the current username." },
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
}
