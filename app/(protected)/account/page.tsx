import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth-guards";
import { UserRepository } from "@/domain/user/UserRepository";
import AccountForm from "./AccountForm";

const userRepository = new UserRepository();

export default async function AccountPage() {
	const user = await requireUser();

	const accountUser = await userRepository.findById(user.id);

	if (!accountUser) {
		redirect("/login?error=unauthorized");
	}

	const creator = await userRepository.findById(accountUser.createdById);

	return (
		<AccountForm
			username={accountUser.username}
			registeredName={accountUser.registeredName}
			createdAt={accountUser.createdAt.toISOString()}
			createdBy={creator?.username ?? "Unknown"}
		/>
	);
}
