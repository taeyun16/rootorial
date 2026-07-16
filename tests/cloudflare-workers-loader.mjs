const cloudflareWorkersStub = `
  function publicationRows(query) {
    if (!String(query).includes("content_publication_overrides")) return [];
    const rows = globalThis.__ROOTORIAL_TEST_PUBLICATION_ROWS__;
    return Array.isArray(rows) ? rows : [];
  }
  function emptyStatement(rows = []) {
    return {
      bind() { return this; },
      async all() { return { results: rows, success: true, meta: {} }; },
      async first() { return rows[0] ?? null; },
      async run() { return { results: [], success: true, meta: { changes: 0 } }; },
    };
  }
  export const env = {
    DB: {
      prepare(query) { return emptyStatement(publicationRows(query)); },
      async batch(statements) {
        return Promise.all(statements.map((statement) => statement.run()));
      },
    },
  };
  export class DurableObject {
    constructor(ctx, env) {
      this.ctx = ctx;
      this.env = env;
    }
  }
`;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "cloudflare:workers") {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(cloudflareWorkersStub)}`,
    };
  }

  return nextResolve(specifier, context);
}
