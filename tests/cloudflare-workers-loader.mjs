const cloudflareWorkersStub = `
  function emptyStatement() {
    return {
      bind() { return this; },
      async all() { return { results: [], success: true, meta: {} }; },
      async first() { return null; },
      async run() { return { results: [], success: true, meta: { changes: 0 } }; },
    };
  }
  export const env = {
    DB: {
      prepare() { return emptyStatement(); },
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
