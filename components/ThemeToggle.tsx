"use client";

import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";

export default function ThemeToggle() {
	const [dark, setDark] = useState(false);

	useEffect(() => {
		const savedTheme = localStorage.getItem("theme");

		if (savedTheme === "dark") {
			document.documentElement.dataset.theme = "dark";
			setDark(true);
		} else {
			document.documentElement.dataset.theme = "light";
			setDark(false);
		}
	}, []);

	function toggleTheme() {
		const nextDark = !dark;

		document.documentElement.dataset.theme = nextDark
			? "dark"
			: "light";

		localStorage.setItem(
			"theme",
			nextDark ? "dark" : "light"
		);

		setDark(nextDark);
	}

	return (
		<button
			type="button"
			className={styles.themeToggle}
			onClick={toggleTheme}
			aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
			title={dark ? "Switch to light mode" : "Switch to dark mode"}
		>
			{dark ? "☀" : "☾"}
		</button>
	);
}
