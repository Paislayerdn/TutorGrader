import type { Metadata } from "next";
import { cookies } from "next/headers";

import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";

import "./globals.css";

export const metadata: Metadata = {
	title: "TutorGrader",
	description: "Computer Programming by Wongsathon",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getCurrentUser();
	const cookieStore = await cookies();
	const theme = cookieStore.get("theme")?.value === "dark"
		? "dark"
		: "light";

	return (
		<html
			lang="en"
			data-theme={theme}
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<body>
				<Navbar user={user} />
				{children}
			</body>
		</html>
	);
}
