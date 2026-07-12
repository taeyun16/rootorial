import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  discordMessageForEvent,
  discordThreadIdForEvent,
  systemEventRows,
} from "../src/features/system-events/system-event-format.ts";

const threadIds = {
  DISCORD_SIGNUP_THREAD_ID: "1525745562568098033",
  DISCORD_QUESTION_THREAD_ID: "1525745503965413527",
  DISCORD_FEEDBACK_THREAD_ID: "1525745415079596122",
};

test("routes each event type to its fixed Discord thread", () => {
  assert.equal(
    discordThreadIdForEvent("feedback.created", threadIds),
    "1525745415079596122",
  );
  assert.equal(
    discordThreadIdForEvent("discussion.question.created", threadIds),
    "1525745503965413527",
  );
  assert.equal(
    discordThreadIdForEvent("user.created", threadIds),
    "1525745562568098033",
  );
});

test("creates a privacy-minimized feedback outbox event", () => {
  const rows = systemEventRows({
    id: "event-1",
    type: "feedback.created",
    actorUserId: "user_1",
    entityId: "feedback-1",
    payload: {
      kind: "confusing",
      pagePath: "/curricula/transformer-from-zero",
      pageTitle: "Transformer를 바닥부터 이해하기",
    },
    createdAt: 1_783_800_000_000,
  });

  assert.equal(rows.event.id, "event-1");
  assert.equal(rows.event.status, "pending");
  assert.equal(rows.delivery.channel, "discord");
  assert.equal(rows.delivery.status, "pending");
  assert.doesNotMatch(rows.event.payloadJson, /email|message|body/i);
});

test("formats Discord embeds without mentions or private content", () => {
  const message = discordMessageForEvent({
    id: "event-1",
    type: "discussion.question.created",
    entityId: "question-1",
    payloadJson: JSON.stringify({ scopeId: "transformer-from-zero.vectors.meaning" }),
    createdAt: 1_783_800_000_000,
  });
  const serialized = JSON.stringify(message);

  assert.deepEqual(message.allowed_mentions, { parse: [] });
  assert.equal(message.embeds[0].url, "https://rootorial.com/admin");
  assert.match(serialized, /새 학습 질문/);
  assert.match(serialized, /transformer-from-zero\.vectors\.meaning/);
  assert.doesNotMatch(serialized, /@everyone|question body|email/i);
});

test("neutralizes Discord mentions in client-controlled metadata", () => {
  const message = discordMessageForEvent({
    id: "event-2",
    type: "feedback.created",
    entityId: "feedback-2",
    payloadJson: JSON.stringify({
      kind: "suggestion",
      pagePath: "/curricula/test/@everyone",
      pageTitle: "@everyone 확인",
    }),
    createdAt: 1_783_800_000_000,
  });

  assert.doesNotMatch(JSON.stringify(message), /@everyone/);
  assert.match(JSON.stringify(message), /＠everyone/);
});

test("configures the D1 outbox, Queue retry policy, DLQ, and Clerk webhook", () => {
  const migrations = readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort()
    .map((name) => readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"))
    .join("\n");
  const wrangler = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const server = readFileSync(new URL("../src/server.ts", import.meta.url), "utf8");
  const webhook = readFileSync(new URL("../src/features/system-events/clerk-webhook.ts", import.meta.url), "utf8");

  assert.match(migrations, /CREATE TABLE `system_events`/);
  assert.match(migrations, /CREATE TABLE `notification_deliveries`/);
  assert.match(wrangler, /"queue": "rootorial-system-events"/);
  assert.match(wrangler, /"dead_letter_queue": "rootorial-system-events-dlq"/);
  assert.match(wrangler, /"DISCORD_SIGNUP_THREAD_ID": "1525745562568098033"/);
  assert.match(wrangler, /"DISCORD_QUESTION_THREAD_ID": "1525745503965413527"/);
  assert.match(wrangler, /"DISCORD_FEEDBACK_THREAD_ID": "1525745415079596122"/);
  assert.match(readFileSync(new URL("../src/features/system-events/system-events.ts", import.meta.url), "utf8"), /searchParams\.set\("thread_id", threadId\)/);
  assert.match(server, /async queue\(/);
  assert.match(server, /async scheduled\(/);
  assert.match(webhook, /verifyWebhook/);
  assert.match(webhook, /event\.type !== "user\.created"/);
});
