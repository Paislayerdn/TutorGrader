import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import CreateAccountForm from "./CreateAccountForm";

export default async function CreateAccountPage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login?error=unauthorized");
	}

	return <CreateAccountForm creatorRole={user.role} />;
}
