function emptyStatement() {
  return {
    bind() {
      return this;
    },
    async all() {
      return { results: [], success: true, meta: {} };
    },
    async first() {
      return null;
    },
    async run() {
      return { results: [], success: true, meta: { changes: 0 } };
    },
  };
}

export function workerTestEnv() {
  return {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
    DB: {
      prepare() {
        return emptyStatement();
      },
      async batch(statements) {
        return Promise.all(statements.map((statement) => statement.run()));
      },
    },
  };
}
