import { NextResponse } from "next/server";
import { User } from "@/domain/user/User";
import { getCurrentVisitor } from "@/lib/auth";
import { isRecord } from "@/domain/shared/isRecord";

export { isRecord } from "@/domain/shared/isRecord";

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export async function readJsonObject(
	req: Request,
	invalidJsonMessage = "Invalid JSON body.",
	invalidObjectMessage = "Invalid request body.",
): Promise<Record<string, unknown>> {
	let value: unknown;
	try {
		value = await req.json();
	} catch {
		throw new HttpError(400, invalidJsonMessage);
	}
	if (!isRecord(value)) {
		throw new HttpError(400, invalidObjectMessage);
	}
	return value as Record<string, unknown>;
}

export function fileResponse(file: Blob, filename: string): Response {
	const safeFilename = encodeURIComponent(filename).replace(/['()*]/g, char =>
		`%${char.charCodeAt(0).toString(16).toUpperCase()}`,
	);
	return new Response(file, {
		headers: {
			"Content-Type": "application/octet-stream",
			"X-Content-Type-Options": "nosniff",
			"Cache-Control": "private, no-store",
			"Content-Disposition": `attachment; filename*=UTF-8''${safeFilename}`,
			"Content-Length": String(file.size),
		},
	});
}

export async function requireApiUser(): Promise<User> {
	const visitor = await getCurrentVisitor();

	if (!(visitor instanceof User)) {
		throw new HttpError(401, "Unauthorized.");
	}

	return visitor;
}

export async function requireApiAdmin(): Promise<User> {
	const user = await requireApiUser();

	if (!user.canManageProblems) {
		throw new HttpError(403, "Forbidden.");
	}

	return user;
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
