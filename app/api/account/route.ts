import { NextResponse } from "next/server";

import { route } from "@/lib/http";
import { handleUsername } from "./routeUsername";
import { handlePassword } from "./routePassword";
import { handleDeactivate } from "./routeDeactivate";

export const runtime = "nodejs";

export const PATCH = route(async (request: Request) => {
	let body: {
		action?: string;
		username?: string;
		currentPassword?: string;
		newPassword?: string;
	};

	try {
		const parsed: unknown = await request.json();

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return NextResponse.json(
				{ error: "Invalid request body." },
				{ status: 400 },
			);
		}

		body = parsed as typeof body;
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body." },
			{ status: 400 },
		);
	}

	switch (body.action) {
		case "username":
			return handleUsername(body);

		case "password":
			return handlePassword(body);

		default:
			return NextResponse.json(
				{ error: "Invalid action." },
				{ status: 400 },
			);
	}
});

export const POST = route(async (request: Request) => {
	let body: {
		action?: string;
	};

	try {
		const parsed: unknown = await request.json();

		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed)
		) {
			return NextResponse.json(
				{ error: "Invalid request body." },
				{ status: 400 },
			);
		}

		body = parsed as typeof body;
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body." },
			{ status: 400 },
		);
	}

	if (body.action === "deactivate") {
		return handleDeactivate();
	}

	return NextResponse.json(
		{ error: "Invalid action." },
		{ status: 400 },
	);
});
