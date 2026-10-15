import { NextResponse } from "next/server";
import { Admin } from "@/domain/user/Admin";
import { User } from "@/domain/user/User";
import { getCurrentVisitor } from "@/lib/auth";

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export async function requireApiUser(): Promise<User> {
	const visitor = await getCurrentVisitor();

	if (!(visitor instanceof User)) {
		throw new HttpError(401, "Unauthorized.");
	}

	return visitor;
}

export async function requireApiAdmin(): Promise<Admin> {
	const user = await requireApiUser();

	if (!user.canManageProblems) {
		throw new HttpError(403, "Forbidden.");
	}

	return user as Admin;
}

export function route<C>(
	handler: (req: Request, ctx: C) => Promise<Response>,
) {
	return async (req: Request, ctx: C) => {
		try {
			return await handler(req, ctx);
		} catch (error) {
			if (error instanceof HttpError) {
				return NextResponse.json(
					{ error: error.message },
					{ status: error.status },
				);
			}

			console.error(error);

			return NextResponse.json(
				{ error: "Internal error." },
				{ status: 500 },
			);
		}
	};
}
