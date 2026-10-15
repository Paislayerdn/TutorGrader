import "server-only";

import { cache } from "react";

import { getSession, getSessionStatus } from "@/lib/session";
import { UserRepository } from "@/domain/user/UserRepository";
import { UserStatus } from "@/domain/user/UserStatus";
import { Visitor } from "@/domain/user/Visitor";

const userRepository = new UserRepository();

export const getCurrentVisitor = cache(
	async (): Promise<Visitor> => {
		const session = await getSessionStatus();

		if (session.status !== "authenticated" || !session.userId) {
			return new Visitor();
		}

		try {
			const user = await userRepository.findById(session.userId);

			if (!user || user.status !== UserStatus.ACTIVE) {
				return new Visitor();
			}
			if (
				session.issuedAt !== null &&
				user.passwordChangedAt !== null &&
				session.issuedAt <
					Math.floor(user.passwordChangedAt.getTime() / 1000)
			) {
				return new Visitor();
			}

			return user;
		} catch (error) {
			console.error("Current user lookup error:", error);
			return new Visitor();
		}
	},
);
