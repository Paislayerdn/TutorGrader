import { redirect } from "next/navigation";

import { getSessionStatus } from "@/lib/session";
import { getCurrentUser } from "@/lib/auth";

export default async function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const session = await getSessionStatus();

	if (session.status === "expired") {
		redirect("/login?error=session_expired");
	}

	const user = await getCurrentUser();

	if (!user) {
		redirect("/login?error=unauthorized");
	}

	return children;
}
