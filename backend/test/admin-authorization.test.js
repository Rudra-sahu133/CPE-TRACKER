import assert from "node:assert/strict";
import { test } from "node:test";
import app from "../src/app.js";
import { changeUserRole } from "../src/controllers/admin.controller.js";
import { requireRole } from "../src/middleware/auth.middleware.js";
import { validateRegistration } from "../src/middleware/validate-auth.middleware.js";
import User from "../src/models/user.model.js";

test("role middleware allows only explicitly permitted roles", async () => {
  const authorizeAdmin = requireRole("admin");
  const adminRequest = { authUser: { role: "admin" } };
  const operationsRequest = { authUser: { role: "operations" } };
  let adminError;
  let operationsError;
  let adminNext = false;

  authorizeAdmin(adminRequest, {}, (error) => { adminError = error; adminNext = true; });
  authorizeAdmin(operationsRequest, {}, (error) => { operationsError = error; });

  assert.equal(adminNext, true);
  assert.equal(adminError, undefined);
  assert.equal(operationsError.status, 403);

  let operationsNext = false;
  let standardUserError;
  requireRole("admin", "operations")({ authUser: { role: "operations" } }, {}, (error) => { if (!error) operationsNext = true; });
  requireRole("admin", "operations")({ authUser: { role: "user" } }, {}, (error) => { standardUserError = error; });
  assert.equal(operationsNext, true);
  assert.equal(standardUserError.status, 403);
});

test("registration ignores client-supplied role elevation", () => {
  const request = { body: { name: "New User", email: "new@example.com", password: "long-enough-password", role: "admin" } };
  let middlewareError;
  validateRegistration(request, null, (error) => { middlewareError = error; });
  assert.equal(middlewareError, undefined);
  assert.deepEqual(request.validatedRegistration, { name: "New User", email: "new@example.com", password: "long-enough-password" });
});

test("new accounts default to the standard user role", () => {
  const user = new User({ name: "New User", email: "new@example.com", passwordHash: "test-hash" });
  assert.equal(user.role, "user");
});

test("standard users and unauthenticated callers cannot access admin endpoints", async () => {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}/api/admin`;
    for (const path of ["/overview", "/users", "/audit-logs"]) {
      const response = await fetch(`${base}${path}`);
      assert.equal(response.status, 401, `${path} must require a verified session`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("role updates reject self changes and administrator grants", async () => {
  const response = { status() { return this; }, json() { return this; } };
  const nextErrors = [];
  await changeUserRole(
    { params: { userId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { role: "admin" }, authUser: { id: "bbbbbbbbbbbbbbbbbbbbbbbb" } },
    response,
    (error) => nextErrors.push(error),
  );
  await changeUserRole(
    { params: { userId: "aaaaaaaaaaaaaaaaaaaaaaaa" }, body: { role: "operations" }, authUser: { id: "aaaaaaaaaaaaaaaaaaaaaaaa" } },
    response,
    (error) => nextErrors.push(error),
  );

  assert.equal(nextErrors.length, 2);
  assert.equal(nextErrors[0].status, 400);
  assert.match(nextErrors[0].message, /bootstrap command/);
  assert.equal(nextErrors[1].status, 400);
  assert.match(nextErrors[1].message, /own role/);
});
