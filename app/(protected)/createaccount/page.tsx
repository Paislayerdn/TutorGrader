import { redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import { Admin } from "@/domain/user/Admin";
import { Owner } from "@/domain/user/Owner";
import CreateAccountForm from "./CreateAccountForm";

export default async function CreateAccountPage() {
	const user = await getCurrentVisitor();

	if (!user) redirect("/login?error=unauthorized");
	if (!(user instanceof Admin)) redirect("/dashboard");

	const creatorRole = user instanceof Owner ? "OWNER" : "ADMIN";

	return <CreateAccountForm creatorRole={creatorRole} />;
}
