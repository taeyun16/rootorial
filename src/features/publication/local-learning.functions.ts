import { createServerFn } from "@tanstack/react-start";
import { getRequestHost } from "@tanstack/react-start/server";
import { isLocalContentPreviewAllowed } from "./local-content-preview";

export const getLocalLearningMode = createServerFn({ method: "GET" }).handler(() =>
  isLocalContentPreviewAllowed({
    development: import.meta.env.DEV,
    enabledValue: import.meta.env.MODE === "content-preview" ? "1" : undefined,
    host: getRequestHost(),
  }),
);
