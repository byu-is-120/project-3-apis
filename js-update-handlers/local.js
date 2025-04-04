import { handler } from "./index.js";

async function test() {
  const start = Date.now();
  await handler();
  const end = Date.now();
  console.log("Execution time:", end - start, "ms");
}

test();
