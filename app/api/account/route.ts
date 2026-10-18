import { NextResponse } from "next/server";

import { readJsonObject, route } from "@/lib/http";
import { handleUsername } from "./routeUsername";
import { handlePassword } from "./routePassword";
import { handleDeactivate } from "./routeDeactivate";

export const runtime = "nodejs";

export const PATCH = route(async (request: Request) => {
	const body = await readJsonObject(request) as {
		action?: string;
		username?: string;
		currentPassword?: string;
		newPassword?: string;
	};

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
	const body = await readJsonObject(request) as {
		action?: string;
	};

	if (body.action === "deactivate") {
		return handleDeactivate();
	}

	return NextResponse.json(
		{ error: "Invalid action." },
		{ status: 400 },
	);
});
