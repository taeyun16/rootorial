import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
  buildProgressMetadata,
  readCompletedFromMetadata,
  readProgressVersion,
  validateCompletedSlugs,
} from "./progress";

function preventSharedCaching() {
  setResponseHeader("Cache-Control", "private, no-store");
}

export const getMyProgress = createServerFn({ method: "GET" }).handler(
  async () => {
    preventSharedCaching();

    const { userId } = await auth();
    if (!userId) {
      throw new Error("로그인이 필요합니다.");
    }

    const user = await clerkClient().users.getUser(userId);
    return {
      completed: readCompletedFromMetadata(user.privateMetadata),
      needsMigration: readProgressVersion(user.privateMetadata) < 2,
    };
  },
);

export const syncMyProgress = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      throw new Error("완료한 챕터 목록이 필요합니다.");
    }

    return {
      completedSlugs: validateCompletedSlugs(
        (input as { completedSlugs?: unknown }).completedSlugs,
      ),
    };
  })
  .handler(async ({ data }) => {
    preventSharedCaching();

    const { userId } = await auth();
    if (!userId) {
      throw new Error("로그인이 필요합니다.");
    }

    const user = await clerkClient().users.updateUserMetadata(userId, {
      privateMetadata: buildProgressMetadata(data.completedSlugs),
    });

    return {
      completed: readCompletedFromMetadata(user.privateMetadata),
    };
  });
