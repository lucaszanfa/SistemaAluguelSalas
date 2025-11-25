import assert from "node:assert";
import { test } from "node:test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test("lista de salas responde com array", async () => {
  const res = await fetch(`${BASE_URL}/api/rooms`);
  assert.strictEqual(res.ok, true, "Resposta deve ser 2xx");
  const data = await res.json();
  assert.ok(Array.isArray(data), "Payload deve ser um array");
});

test("sala inexistente retorna 404", async () => {
  const res = await fetch(`${BASE_URL}/api/rooms/999999`);
  assert.strictEqual(res.status, 404);
});
