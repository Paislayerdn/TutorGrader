import { redirect } from "next/navigation";

import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import { User } from "@/domain/user/User";
import { Visitor } from "@/domain/user/Visitor";
import { getCurrentVisitor } from "@/lib/auth";

export async function requireUser(): Promise<User> {
	const visitor = await getCurrentVisitor();

	if (!(visitor instanceof User)) {
		redirect("/login?error=unauthorized");
	}

	return visitor;
}

export async function requireAdmin(): Promise<Admin> {
	const visitor = await getCurrentVisitor();

	if (!(visitor instanceof Admin)) {
		redirect("/dashboard");
	}

	return visitor;
}

export async function requireOwner(): Promise<Owner> {
	const visitor = await getCurrentVisitor();

	if (!(visitor instanceof Owner)) {
		redirect("/dashboard");
	}

	return visitor;
}

export async function getVisitor(): Promise<Visitor> {
	return getCurrentVisitor();
}
