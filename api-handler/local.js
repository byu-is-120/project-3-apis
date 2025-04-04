import { handler } from "./index.js";

async function test() {
  const start = Date.now();
  const res = await handler();
  const end = Date.now();
  console.log("Execution time:", end - start, "ms");
  console.log("Response:", res);
}

test();
