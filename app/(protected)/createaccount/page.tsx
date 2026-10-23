import { redirect } from "next/navigation";

import { getCurrentVisitor } from "@/lib/auth";
import { Role } from "@/domain/user/Role";
import CreateAccountForm from "./CreateAccountForm";

export default async function CreateAccountPage() {
	const user = await getCurrentVisitor();

	if (!user.canCreateAccounts) redirect("/dashboard");

	const creatorRole = user.creatableRoles.includes(Role.ADMIN) ? Role.OWNER : Role.ADMIN;

	return <CreateAccountForm creatorRole={creatorRole} />;
}
