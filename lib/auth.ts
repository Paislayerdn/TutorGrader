import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSession } from "@/lib/session";

export async function getCurrentUser() {
	const userId = await getSession();

	if (!userId) {
		return null;
	}

	const { data: user, error } = await supabaseAdmin
		.from("app_user")
		.select("id, username, registered_name, role, status")
		.eq("id", userId)
		.maybeSingle();

	if (error) {
		console.error("Current user lookup error:", error);
		return null;
	}

	if (!user || user.status !== "ACTIVE") {
		return null;
	}

	return user;
}
