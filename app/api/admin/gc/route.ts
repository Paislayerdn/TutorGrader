import { NextResponse } from "next/server";

import { getCurrentVisitor } from "@/lib/auth";
import { Owner } from "@/domain/user/Owner";

export const runtime = "nodejs";

export async function POST() {
	const user = await getCurrentVisitor();

	if (!user) {
		return NextResponse.json(
			{ error: "Unauthorized." },
			{ status: 401 },
		);
	}

	if (!(user instanceof Owner)) {
		return NextResponse.json(
			{ error: "Owner permission required." },
			{ status: 403 },
		);
	}

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!url || !serviceKey) {
		return NextResponse.json(
			{ error: "Garbage collector is not configured." },
			{ status: 500 },
		);
	}

	try {
		const response = await fetch(
			`${url.replace(/\/+$/, "")}/functions/v1/garbage-collect-canonical-content`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${serviceKey}`,
					apikey: serviceKey,
					"Content-Type": "application/json",
				},
				body: "{}",
				cache: "no-store",
			},
		);

		const result: unknown = await response.json().catch (() => ({
			error: "The garbage collector returned an invalid response.",
		}));

		return NextResponse.json(result, {
			status: response.status,
		});
	} catch (error) {
		console.error("Garbage collection request failed:", error);

		return NextResponse.json(
			{ error: "Unable to contact the garbage collector." },
			{ status: 502 },
		);
	}
}
