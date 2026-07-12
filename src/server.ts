import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";

export { LearningSession } from "./durable-objects/LearningSession";
export { LearningPresence } from "./durable-objects/LearningPresence";

const fetch = createStartHandler(defaultStreamHandler);
export default { fetch };
