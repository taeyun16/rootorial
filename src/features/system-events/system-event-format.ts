export type SystemEventType =
  | "feedback.created"
  | "discussion.question.created"
  | "user.created";

export type SystemEventPayload =
  | { kind: "incorrect" | "confusing" | "suggestion"; pagePath: string; pageTitle: string }
  | { scopeId: string }
  | { source: "clerk" };

export type DiscordThreadBindings = {
  DISCORD_SIGNUP_THREAD_ID?: string;
  DISCORD_QUESTION_THREAD_ID?: string;
  DISCORD_FEEDBACK_THREAD_ID?: string;
};

export function discordThreadIdForEvent(
  type: SystemEventType,
  bindings: DiscordThreadBindings,
) {
  if (type === "feedback.created") return bindings.DISCORD_FEEDBACK_THREAD_ID;
  if (type === "discussion.question.created") return bindings.DISCORD_QUESTION_THREAD_ID;
  return bindings.DISCORD_SIGNUP_THREAD_ID;
}

export function systemEventRows(input: {
  id?: string;
  type: SystemEventType;
  actorUserId?: string | null;
  entityId: string;
  payload: SystemEventPayload;
  createdAt?: number;
}) {
  const id = input.id ?? crypto.randomUUID();
  return {
    event: {
      id,
      type: input.type,
      actorUserId: input.actorUserId ?? null,
      entityId: input.entityId,
      payloadJson: JSON.stringify(input.payload),
      status: "pending" as const,
      createdAt: input.createdAt ?? Date.now(),
    },
    delivery: {
      eventId: id,
      channel: "discord" as const,
      status: "pending" as const,
    },
  };
}

function parsePayload(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

const EVENT_PRESENTATION: Record<SystemEventType, { title: string; color: number }> = {
  "feedback.created": { title: "새 콘텐츠 피드백", color: 0xb7795f },
  "discussion.question.created": { title: "새 학습 질문", color: 0x355f50 },
  "user.created": { title: "새 사용자 가입", color: 0x5577aa },
};

function safeDiscordText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "unknown";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replaceAll("@", "＠")
    .trim()
    .slice(0, maxLength) || "unknown";
}

export function discordMessageForEvent(event: {
  id: string;
  type: SystemEventType;
  entityId: string;
  payloadJson: string;
  createdAt: number;
}) {
  const payload = parsePayload(event.payloadJson);
  const presentation = EVENT_PRESENTATION[event.type];
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  if (event.type === "feedback.created") {
    fields.push(
      { name: "유형", value: safeDiscordText(payload.kind, 40), inline: true },
      { name: "페이지", value: safeDiscordText(payload.pageTitle, 200), inline: true },
      { name: "경로", value: safeDiscordText(payload.pagePath, 500) },
    );
  } else if (event.type === "discussion.question.created") {
    fields.push({ name: "토론 범위", value: safeDiscordText(payload.scopeId, 120) });
  } else {
    fields.push({ name: "가입 경로", value: "Clerk", inline: true });
  }

  fields.push({ name: "이벤트 ID", value: event.id.slice(0, 200) });
  return {
    username: "Rootorial Events",
    allowed_mentions: { parse: [] as string[] },
    embeds: [{
      title: presentation.title,
      color: presentation.color,
      url: "https://rootorial.com/admin",
      fields,
      timestamp: new Date(event.createdAt).toISOString(),
      footer: { text: "Rootorial system event" },
    }],
  };
}
