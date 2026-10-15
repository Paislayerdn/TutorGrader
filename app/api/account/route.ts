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
		body = await request.json();
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
				{ error: "Invalid account operation." },
				{ status: 400 },
			);
	}
});

export const POST = route(async (request: Request) => {
	let body: {
		action?: string;
	};

	try {
		body = await request.json();
	} catch {
		return NextResponse.json(
			{ error: "Invalid JSON body." },
			{ status: 400 },
		);
	}

	switch (body.action) {
		case "deactivate":
			return handleDeactivate();

		default:
			return NextResponse.json(
				{ error: "Invalid account operation." },
				{ status: 400 },
			);
	}
});
