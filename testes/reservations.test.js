import assert from "node:assert";
import { test } from "node:test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

test("listar reservas sem userId retorna array", async () => {
  const res = await fetch(`${BASE_URL}/api/reservations`);
  assert.strictEqual(res.ok, true);
  const data = await res.json();
  assert.ok(Array.isArray(data), "Deve retornar array de reservas");
});

test("cancelar reserva inexistente retorna 404", async () => {
  const res = await fetch(`${BASE_URL}/api/reservations/999999`, { method: "DELETE" });
  assert.strictEqual(res.status, 404);
});
