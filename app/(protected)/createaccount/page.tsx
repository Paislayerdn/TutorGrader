import { redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import CreateAccountForm from "./CreateAccountForm";

export default async function CreateAccountPage() {
	const user = await getCurrentVisitor();

	if (!user.canCreateAccounts) redirect("/dashboard");

	const creatorRole = user.creatableRoles.includes("ADMIN") ? "OWNER" : "ADMIN";

	return <CreateAccountForm creatorRole={creatorRole} />;
}
