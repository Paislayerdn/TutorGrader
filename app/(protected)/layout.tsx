import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";

export default async function ProtectedLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/login?error=unauthorized");
	}

	return children;
}
