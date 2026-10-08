import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { clearSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function handleDeactivate() {
	const user = await getCurrentUser();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 }
		);
	}

	const { error } = await supabaseAdmin
		.from("app_user")
		.update({
			status: "INACTIVE",
		})
		.eq("id", user.id);

	if (error) {
		console.error("Account deactivation error:", error);

		return NextResponse.json(
			{ error: "Unable to deactivate account." },
			{ status: 500 }
		);
	}

	await clearSession();

	return NextResponse.json({
		success: true,
	});
}
