"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
	children: ReactNode;
	onClose: () => void;
	closingDisabled?: boolean;
	overlayClassName: string;
	modalClassName: string;
	labelledBy: string;
};

export default function Modal({
	children,
	onClose,
	closingDisabled = false,
	overlayClassName,
	modalClassName,
	labelledBy,
}: Props) {
	useEffect(() => {
		if (closingDisabled) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [closingDisabled, onClose]);

	return (
		<div
			className={overlayClassName}
			role="presentation"
			onMouseDown={event => {
				if (event.target === event.currentTarget && !closingDisabled) onClose();
			}}
		>
			<div
				className={modalClassName}
				role="dialog"
				aria-modal="true"
				aria-labelledby={labelledBy}
			>
				{children}
			</div>
		</div>
	);
}
