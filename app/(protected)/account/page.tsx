import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import AccountForm from "./AccountForm";

export default async function AccountPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login?error=unauthorized");
	}

	return (
		<AccountForm
			username={user.username}
			registeredName={user.registered_name}
		/>
	);
}
