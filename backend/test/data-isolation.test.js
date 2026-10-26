import assert from "node:assert/strict";
import { after, test } from "node:test";
import app from "../src/app.js";
import Professional from "../src/models/professional.model.js";
import Course from "../src/models/course.model.js";
import Session from "../src/models/session.model.js";
import User from "../src/models/user.model.js";
import { listProfessionals, createProfessional } from "../src/controllers/professionals.controller.js";
import { listCourses, createCourse } from "../src/controllers/courses.controller.js";
import { validateProfessional } from "../src/middleware/validate-professional.middleware.js";
import { validateCourse } from "../src/middleware/validate-course.middleware.js";
import { requireSession } from "../src/middleware/auth.middleware.js";
import { hashToken } from "../src/utils/auth-tokens.js";
import { getCurrentSession } from "../src/controllers/auth.controller.js";
import { apiFetch } from "../../frontend/components/auth/api-fetch.js";

const userA = "aaaaaaaaaaaaaaaaaaaaaaaa";
const userB = "bbbbbbbbbbbbbbbbbbbbbbbb";
const originalMethods = {
  professionalFind: Professional.find,
  professionalExists: Professional.exists,
  professionalCreate: Professional.create,
  courseFind: Course.find,
  courseCreate: Course.create,
  sessionFindOne: Session.findOne,
  userFindById: User.findById,
};

after(() => {
  Professional.find = originalMethods.professionalFind;
  Professional.exists = originalMethods.professionalExists;
  Professional.create = originalMethods.professionalCreate;
  Course.find = originalMethods.courseFind;
  Course.create = originalMethods.courseCreate;
  Session.findOne = originalMethods.sessionFindOne;
  User.findById = originalMethods.userFindById;
});

test("all existing Professional and Course routes reject unauthenticated requests", async () => {
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  try {
    const base = `http://127.0.0.1:${server.address().port}/api`;
    for (const [path, method, body] of [
      ["/professionals", "GET"],
      ["/professionals?owner=" + userA, "GET"],
      ["/professionals", "POST", { name: "Example", owner: userB }],
      ["/courses", "GET"],
      ["/courses?userId=" + userA, "GET"],
      ["/courses", "POST", { title: "Example", userId: userB }],
    ]) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(response.status, 401, `${method} ${path} must require a session`);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("session middleware derives identity from the verified server-side session", async () => {
  const cookieToken = "opaque-session-cookie-token";
  Session.findOne = (filter) => {
    assert.equal(filter.tokenHash, hashToken(cookieToken));
    return { select: async () => ({ _id: "session-id", userId: userA }) };
  };
  User.findById = (id) => {
    assert.equal(id, userA);
    return { select() { return this; }, lean: async () => ({ _id: { toString: () => userA }, name: "User A", email: "a@example.com" }) };
  };
  const request = {
    headers: { cookie: `cpe_session=${cookieToken}` },
    body: { owner: userB, userId: userB },
  };
  let middlewareError;
  await requireSession(request, {}, (error) => { middlewareError = error; });
  assert.equal(middlewareError, undefined);
  assert.deepEqual(request.authUser, { id: userA, name: "User A", email: "a@example.com" });
});

test("current-session endpoint scopes the cookie to all API routes and clears the legacy path", async () => {
  const previousSecret = process.env.AUTH_CSRF_SECRET;
  process.env.AUTH_CSRF_SECRET = "unit-test-only-secret-value-at-least-32-characters";
  const cookieEvents = [];
  const response = {
    cookie(name, value, options) { cookieEvents.push({ type: "set", name, value, options }); return this; },
    clearCookie(name, options) { cookieEvents.push({ type: "clear", name, options }); return this; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  try {
    await getCurrentSession({ authToken: "valid-session", authSession: { expiresAt: new Date(Date.now() + 60_000) }, authUser: { id: userA, name: "User A", email: "a@example.com" } }, response, (error) => { throw error; });
    const activeCookie = cookieEvents.find((event) => event.type === "set");
    const clearedLegacyCookie = cookieEvents.find((event) => event.type === "clear");
    assert.equal(response.statusCode, 200);
    assert.equal(activeCookie.options.path, "/api");
    assert.equal(activeCookie.options.httpOnly, true);
    assert.equal(clearedLegacyCookie.options.path, "/api/auth");
  } finally {
    if (previousSecret === undefined) delete process.env.AUTH_CSRF_SECRET;
    else process.env.AUTH_CSRF_SECRET = previousSecret;
  }
});

test("a resource 401 only clears auth after the session endpoint confirms 401", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  let sessionStatus = 200;
  let authExpiredEvents = 0;
  const testWindow = new EventTarget();
  testWindow.addEventListener("cpe:session-expired", () => { authExpiredEvents += 1; });
  globalThis.window = testWindow;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.credentials, "include");
    return url.endsWith("/auth/session")
      ? new Response("{}", { status: sessionStatus })
      : new Response("{}", { status: 401 });
  };
  try {
    await apiFetch("http://localhost:5000/api/professionals");
    assert.equal(authExpiredEvents, 0);
    sessionStatus = 401;
    await apiFetch("http://localhost:5000/api/courses");
    assert.equal(authExpiredEvents, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test("professional and course schemas require an owner reference", async () => {
  const professional = new Professional({
    name: "Example", email: "example@example.com", profession: "CPA", state: "CA", licenseExpiry: new Date("2030-01-01"),
  });
  const course = new Course({ title: "Ethics", provider: "Provider", profession: "CPA", credits: 2 });
  const professionalError = await professional.validate().catch((error) => error);
  const courseError = await course.validate().catch((error) => error);
  assert.ok(professionalError.errors.owner);
  assert.ok(courseError.errors.owner);
});

test("existing field validators accept valid input and reject forged ownership", () => {
  const professionalBody = {
    name: "Taylor Morgan", email: "Taylor@example.com", profession: "CPA", state: "CA", licenseExpiry: "2030-05-01",
  };
  const courseBody = { title: "Ethics", provider: "Provider", profession: "Both", credits: 2.5 };
  const validProfessional = { body: professionalBody };
  const validCourse = { body: courseBody };
  let professionalError;
  let courseError;
  validateProfessional(validProfessional, null, (error) => { professionalError = error; });
  validateCourse(validCourse, null, (error) => { courseError = error; });
  assert.equal(professionalError, undefined);
  assert.equal(courseError, undefined);
  assert.equal(validProfessional.validatedProfessional.email, "taylor@example.com");
  assert.equal(Object.hasOwn(validCourse.validatedCourse, "owner"), false);

  let forgedProfessionalError;
  let forgedCourseError;
  validateProfessional({ body: { ...professionalBody, owner: userB } }, null, (error) => { forgedProfessionalError = error; });
  validateCourse({ body: { ...courseBody, userId: userB } }, null, (error) => { forgedCourseError = error; });
  assert.equal(forgedProfessionalError.status, 400);
  assert.equal(forgedCourseError.status, 400);
});

test("list queries expose only the authenticated user's records, excluding unowned records", async () => {
  const owners = [userA, userB, undefined];
  const professionalRecords = owners.map((owner, index) => ({
    _id: `${index}`.padStart(24, "0"), owner, name: `Professional ${index}`, email: `p${index}@example.com`,
    profession: "CPA", state: "CA", licenseExpiry: new Date("2030-01-01"), createdAt: new Date(), updatedAt: new Date(),
  }));
  const courseRecords = owners.map((owner, index) => ({
    _id: `${index}`.padStart(24, "0"), owner, title: `Course ${index}`, provider: "Provider", profession: "CPA", credits: 2, createdAt: new Date(), updatedAt: new Date(),
  }));

  Professional.find = (filter) => ({ sort() { return this; }, lean: async () => professionalRecords.filter((record) => record.owner === filter.owner) });
  Course.find = (filter) => ({ sort() { return this; }, lean: async () => courseRecords.filter((record) => record.owner === filter.owner) });

  for (const id of [userA, userB]) {
    for (const [controller, expected] of [
      [listProfessionals, `Professional ${id === userA ? 0 : 1}`],
      [listCourses, `Course ${id === userA ? 0 : 1}`],
    ]) {
      let status;
      let payload;
      const response = { status(code) { status = code; return this; }, json(body) { payload = body; return this; } };
      const request = { authUser: { id }, query: { owner: id === userA ? userB : userA } };
      await controller(request, response, (error) => { throw error; });
      assert.equal(status, 200);
      assert.equal(payload.data.length, 1);
      assert.equal(payload.data[0].name ?? payload.data[0].title, expected);
    }
  }
});

test("creation controllers take ownership from the verified session only", async () => {
  let professionalInput;
  let courseInput;
  Professional.exists = async (filter) => { assert.deepEqual(filter, { owner: userA, email: "owned@example.com" }); return false; };
  Professional.create = async (input) => { professionalInput = input; return { ...input, _id: "cccccccccccccccccccccccc", createdAt: new Date(), updatedAt: new Date() }; };
  Course.create = async (input) => { courseInput = input; return { ...input, _id: "dddddddddddddddddddddddd", createdAt: new Date(), updatedAt: new Date() }; };

  const professionalRequest = {
    authUser: { id: userA },
    validatedProfessional: { name: "Owner A", email: "owned@example.com", profession: "CPA", state: "CA", licenseExpiry: new Date("2030-01-01") },
  };
  const courseRequest = { authUser: { id: userA }, validatedCourse: { title: "Ethics", provider: "Provider", profession: "CPA", credits: 2 } };
  for (const [controller, request] of [[createProfessional, professionalRequest], [createCourse, courseRequest]]) {
    const response = { status() { return this; }, json(payload) { this.payload = payload; return this; } };
    await controller(request, response, (error) => { throw error; });
    assert.equal(response.payload.status, "ok");
  }
  assert.equal(professionalInput.owner, userA);
  assert.equal(courseInput.owner, userA);
  assert.notEqual(professionalInput.owner, userB);
  assert.notEqual(courseInput.owner, userB);
});
