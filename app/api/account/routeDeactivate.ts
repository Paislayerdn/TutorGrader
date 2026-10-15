import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/http";
import { clearSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function handleDeactivate() {
	const user = await requireApiUser();

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
