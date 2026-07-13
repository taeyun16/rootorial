import { auth } from "@clerk/tanstack-react-start/server";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { isDiscussionAdmin } from "../discussion/discussion";

type AdminAuthBindings = {
  ROOTORIAL_ADMIN_USER_IDS?: string;
};

function configuredAdmins() {
  const bindings = env as unknown as AdminAuthBindings;
  return (
    bindings.ROOTORIAL_ADMIN_USER_IDS ??
    process.env.ROOTORIAL_ADMIN_USER_IDS
  );
}

export async function currentAdmin() {
  try {
    const userId = (await auth()).userId;
    return {
      userId,
      isAdmin: isDiscussionAdmin(userId, configuredAdmins()),
    };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

export function privateResponse() {
  setResponseHeader("Cache-Control", "private, no-store");
}
