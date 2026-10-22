import type { ReactNode } from "react";

type Props = {
	pageClassName: string;
	contentClassName: string;
	children: ReactNode;
	beforeContent?: ReactNode;
};

export default function PageFrame({
	pageClassName,
	contentClassName,
	children,
	beforeContent,
}: Props) {
	return (
		<main className={pageClassName}>
			{beforeContent}
			<section className={contentClassName}>{children}</section>
		</main>
	);
}
