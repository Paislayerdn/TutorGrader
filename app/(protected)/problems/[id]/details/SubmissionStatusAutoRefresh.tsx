"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
	active: boolean;
};

export default function SubmissionStatusAutoRefresh({ active }: Props) {
	const router = useRouter();

	useEffect(() => {
		if (!active) {
			return;
		}

		const intervalId = window.setInterval(() => {
			if (document.visibilityState === "visible") {
				router.refresh();
			}
		}, 3000);

		return () => window.clearInterval(intervalId);
	}, [active, router]);
	return null;
}
