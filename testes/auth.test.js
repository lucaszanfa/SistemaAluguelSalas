import assert from "node:assert";
import { test } from "node:test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test("login falha sem credenciais", async () => {
  const res = await fetch(`${BASE_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  assert.strictEqual(res.status, 400);
});

test("registro exige campos obrigatórios", async () => {
  const res = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Teste" })
  });
  assert.strictEqual(res.status, 400);
});
