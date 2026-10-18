import { NextResponse } from "next/server";
import argon2 from "argon2";

import { requireApiUser } from "@/lib/http";
import { supabaseAdmin } from "@/data/supabase/supabase-admin";
import { createSession } from "@/lib/session";

export async function handlePassword(body: {
	currentPassword?: string;
	newPassword?: string;
}) {
	const user = await requireApiUser();

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

	const samePassword = await argon2.verify(
		account.password_hash,
		newPassword
	);

	if (samePassword) {
		return NextResponse.json(
			{ error: "New password must be different from the current password." },
			{ status: 400 }
		);
	}

	const passwordHash = await argon2.hash(newPassword);

	const { error: updateError } = await supabaseAdmin.rpc(
		"change_password_with_history",
		{
			p_user_id: user.id,
			p_password_hash: passwordHash,
		}
	);

	if (updateError) {
		console.error("Password update error:", updateError);

		return NextResponse.json(
			{ error: "Unable to change password." },
			{ status: 500 }
		);
	}
	await createSession(user.id);

	return NextResponse.json({
		success: true,
	});
}
