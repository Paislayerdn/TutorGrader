import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/http";
import { clearSession } from "@/lib/session";
import { UserRepo } from "@/data/supabase/repositories/UserRepo";

const userRepo = new UserRepo();

export async function handleDeactivate() {
	const user = await requireApiUser();

	try {
		await userRepo.deactivate(user.id);
	} catch {
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
