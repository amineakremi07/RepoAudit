import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp(config);

if (config.JOB_QUEUE_DRIVER === "memory") {
  app.log.warn("JOB_QUEUE_DRIVER=memory: scans are stored but no scanner will pick them up.");
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}

await app.listen({ port: config.API_PORT, host: config.API_HOST });
