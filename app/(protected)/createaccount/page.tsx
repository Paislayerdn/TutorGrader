import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import CreateAccountForm from "./CreateAccountForm";

export default async function CreateAccountPage() {
	const user = await getCurrentUser();

	if (!user) redirect("/login?error=unauthorized");
	if (!(user instanceof Admin)) redirect("/dashboard");

	const creatorRole = user instanceof Owner ? "OWNER" : "ADMIN";

	return <CreateAccountForm creatorRole={creatorRole} />;
}
