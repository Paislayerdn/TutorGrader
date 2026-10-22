import { NextResponse } from "next/server";

import { HttpError, readJsonObject, route } from "@/lib/http";
import { handleUsername } from "./routeUsername";
import { handlePassword } from "./routePassword";
import { handleDeactivate } from "./routeDeactivate";

export const runtime = "nodejs";

export const PATCH = route(async (request: Request) => {
	const body = await readJsonObject(request);
	for (const key of ["action", "username", "currentPassword", "newPassword"] as const) {
		if (body[key] !== undefined && typeof body[key] !== "string") {
			throw new HttpError(400, "Invalid request body.");
		}
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
	const body = await readJsonObject(request);
	if (body.action !== undefined && typeof body.action !== "string") {
		throw new HttpError(400, "Invalid request body.");
	}

	if (body.action === "deactivate") {
		return handleDeactivate();
	}

	return NextResponse.json(
		{ error: "Invalid action." },
		{ status: 400 },
	);
});
