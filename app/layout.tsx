import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth";
import Navbar from "@/components/Navbar";

import "./globals.css";

export const metadata: Metadata = {
	title: "TutorGrader",
	description: "OOP Learning Platform",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const user = await getCurrentUser();

	return (
		<html
			lang="en"
			data-scroll-behavior="smooth"
			suppressHydrationWarning
		>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function () {
								const theme = localStorage.getItem("theme");

								if (theme === "dark") {
									document.documentElement.dataset.theme = "dark";
								}
							})();
						`,
					}}
				/>
			</head>

			<body>
				<Navbar user={user} />
				{children}
			</body>
		</html>
	);
}
