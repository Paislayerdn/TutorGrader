import { redirect } from "next/navigation";

import { getSessionStatus } from "@/lib/session";
import { requireUser } from "@/lib/auth-guards";

export default async function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await getSessionStatus();

	if (session.status === "expired") {
		redirect("/login?error=session_expired");
	}

	await requireUser();

	return children;
}
