import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { UserRepository } from "@/domain/user/UserRepository";
import AccountForm from "./AccountForm";

const userRepository = new UserRepository();

export default async function AccountPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login?error=unauthorized");
	}

	const accountUser = await userRepository.findByIdWithCreator(user.id);

	if (!accountUser) {
		redirect("/login?error=unauthorized");
	}

	return (
		<AccountForm
			username={accountUser.username}
			registeredName={accountUser.registeredName}
			createdAt={accountUser.createdAt.toISOString()}
			createdBy={accountUser.createdBy?.username ?? "Unknown"}
		/>
	);
}
