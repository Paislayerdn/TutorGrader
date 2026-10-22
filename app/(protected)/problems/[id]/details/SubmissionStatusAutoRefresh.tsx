"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
	active: boolean;
	status: string | undefined;
};

export default function SubmissionStatusAutoRefresh({ active, status }: Props) {
	const router = useRouter();
	const previousStatus = useRef(status);

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

	useEffect(() => {
		if (previousStatus.current !== status && previousStatus.current !== undefined) {
			previousStatus.current = status;
			window.location.reload();
			return;
		}

		previousStatus.current = status;
	}, [status]);

	return null;
}
