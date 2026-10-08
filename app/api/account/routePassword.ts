import { NextResponse } from "next/server";
import argon2 from "argon2";

import { getCurrentUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function handlePassword(body: {
	currentPassword?: string;
	newPassword?: string;
}) {
	const user = await getCurrentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 }
		);
	}

	const currentPassword = body.currentPassword;
	const newPassword = body.newPassword;

	if (!currentPassword || !newPassword) {
		return NextResponse.json(
			{ error: "All password fields are required." },
			{ status: 400 }
		);
	}

	const { data: account, error: lookupError } = await supabaseAdmin
		.from("app_user")
		.select("password_hash")
		.eq("id", user.id)
		.single();

	if (lookupError || !account) {
		console.error("Password lookup error:", lookupError);

		return NextResponse.json(
			{ error: "Unable to find account." },
			{ status: 500 }
		);
	}

	const validPassword = await argon2.verify(
		account.password_hash,
		currentPassword
	);

	if (!validPassword) {
		return NextResponse.json(
			{ error: "Current password is incorrect." },
			{ status: 400 }
		);
	}

	const passwordHash = await argon2.hash(newPassword);

	const { error: updateError } = await supabaseAdmin
		.from("app_user")
		.update({
			password_hash: passwordHash,
		})
		.eq("id", user.id);

	if (updateError) {
		console.error("Password update error:", updateError);

		return NextResponse.json(
			{ error: "Unable to change password." },
			{ status: 500 }
		);
	}

	return NextResponse.json({
		success: true,
	});
}
