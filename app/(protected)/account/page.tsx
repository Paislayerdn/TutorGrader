import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth-guards";
import { UserRepo } from "@/data/supabase/repositories/UserRepo";
import AccountForm from "./AccountForm";

const userRepo = new UserRepo();

export default async function AccountPage() {
	const user = await requireUser();

	const accountUser = await userRepo.findById(user.id);

	if (!accountUser) {
		redirect("/login?error=unauthorized");
	}

	const creator = await userRepo.findById(accountUser.createdById);

	return (
		<AccountForm
			username={accountUser.username}
			registeredName={accountUser.registeredName}
			createdAt={accountUser.createdAt.toISOString()}
			createdBy={creator?.username ?? "Unknown"}
		/>
	);
}
