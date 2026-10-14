import "server-only";

import { cache } from "react";

import { getSession } from "@/lib/session";
import { UserRepository } from "@/domain/user/UserRepository";
import { UserStatus } from "@/domain/user/UserStatus";
import { Visitor } from "@/domain/user/Visitor";

const userRepository = new UserRepository();

export const getCurrentVisitor = cache(
	async (): Promise<Visitor> => {
		const userId = await getSession();

		if (!userId) { return new Visitor(); }

		try {
			const user = await userRepository.findById(userId);

			if (!user || user.status !== UserStatus.ACTIVE) {
				return new Visitor();
			}

			return user;
		} catch (error) {
			console.error("Current user lookup error:", error);
			return new Visitor();
		}
	},
);
