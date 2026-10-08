import { NextResponse } from "next/server";

import { handleUsername } from "./routeUsername";
import { handlePassword } from "./routePassword";
import { handleDeactivate } from "./routeDeactivate";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
	const body = await request.json();

	switch (body.action) {
		case "username":
			return handleUsername(body);

		case "password":
			return handlePassword(body);

		default:
			return NextResponse.json(
				{ error: "Invalid account operation." },
				{ status: 400 }
			);
	}
}

export async function POST(request: Request) {
	const body = await request.json();

	switch (body.action) {
		case "deactivate":
			return handleDeactivate();

		default:
			return NextResponse.json(
				{ error: "Invalid account operation." },
				{ status: 400 }
			);
	}
}
