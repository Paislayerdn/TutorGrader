import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/http";
import { createSession } from "@/lib/session";
import { Password, PASSWORD_MAX_LENGTH } from "@/domain/user/Password";
import { PasswordHasher } from "@/data/security/PasswordHasher";
import { UserRepo } from "@/data/supabase/repositories/UserRepo";

const passwordHasher = new PasswordHasher();
const userRepo = new UserRepo();

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
	if (currentPassword.length > PASSWORD_MAX_LENGTH) {
		return NextResponse.json(
			{ error: "Current password is incorrect." },
			{ status: 400 },
		);
	}
	const parsedNewPassword = Password.parseNew(newPassword);
	if (!parsedNewPassword) {
		return NextResponse.json(
			{ error: "New password must be between 8 and 128 characters." },
			{ status: 400 },
		);
	}

	let storedPasswordHash: string | null;
	try {
		storedPasswordHash = await userRepo.findPasswordHash(user.id);
	} catch {
		return NextResponse.json(
			{ error: "Unable to find account." },
			{ status: 500 }
		);
	}
	if (!storedPasswordHash) {
		return NextResponse.json({ error: "Unable to find account." }, { status: 500 });
	}

	const validPassword = await passwordHasher.verify(
		storedPasswordHash,
		currentPassword
	);

	if (!validPassword) {
		return NextResponse.json(
			{ error: "Current password is incorrect." },
			{ status: 400 }
		);
	}

	const samePassword = await passwordHasher.verify(
		storedPasswordHash,
		parsedNewPassword.value
	);

	if (samePassword) {
		return NextResponse.json(
			{ error: "New password must be different from the current password." },
			{ status: 400 }
		);
	}

	const passwordHash = await passwordHasher.hash(parsedNewPassword.value);

	try {
		await userRepo.changePassword(user.id, passwordHash);
	} catch {
		return NextResponse.json(
			{ error: "Unable to change password." },
			{ status: 500 }
		);
	}
	const passwordChangedAt = await userRepo.findPasswordChangedAt(user.id);
	const issuedAt = passwordChangedAt
		? Math.floor(passwordChangedAt.getTime() / 1000)
		: undefined;
	await createSession(user.id, issuedAt);

	return NextResponse.json({
		success: true,
	});
}
