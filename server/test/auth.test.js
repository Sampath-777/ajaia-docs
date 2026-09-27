const test = require("node:test");
const assert = require("node:assert/strict");

test("protected document APIs reject unauthenticated requests", async () => {
  const requests = [
    ["GET", "/api/documents"],
    ["DELETE", "/api/documents/1"],
    ["POST", "/api/documents/1/duplicate"],
    ["POST", "/api/documents/1/summarize"],
  ];

  for (const [method, path] of requests) {
    const response = await fetch(`http://localhost:5000${path}`, { method });

    assert.equal(response.status, 401, `${method} ${path} should require authentication`);

    const body = await response.json();
    assert.equal(body.success, false);
  }
});

test("view-only shared users can read but cannot update a document", async () => {
  const baseUrl = "http://localhost:5000";

  async function login(email) {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });
    assert.equal(response.status, 200, `login should succeed for ${email}`);
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie, "login should return the HTTP-only auth cookie");
    return cookie;
  }

  async function request(path, cookie, options = {}) {
    return fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Cookie: cookie,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  }

  const aliceCookie = await login("alice@example.com");
  const bobCookie = await login("bob@example.com");
  const createResponse = await request("/api/documents", aliceCookie, {
    method: "POST",
    body: JSON.stringify({ title: "View-only permission test" }),
  });
  assert.equal(createResponse.status, 201);
  const { document } = await createResponse.json();

  try {
    const shareResponse = await request(
      `/api/documents/${document.id}/share`,
      aliceCookie,
      {
        method: "POST",
        body: JSON.stringify({ email: "bob@example.com", permission: "view" }),
      }
    );
    assert.equal(shareResponse.status, 200);

    const readResponse = await request(`/api/documents/${document.id}`, bobCookie);
    assert.equal(readResponse.status, 200, "view-only user should be able to read");
    const readBody = await readResponse.json();
    assert.equal(readBody.document.access.permission, "view");

    const updateResponse = await request(`/api/documents/${document.id}`, bobCookie, {
      method: "PATCH",
      body: JSON.stringify({ title: "Unauthorized rename" }),
    });
    assert.equal(updateResponse.status, 403, "view-only user must not update");

    const ownerReadResponse = await request(`/api/documents/${document.id}`, aliceCookie);
    const ownerReadBody = await ownerReadResponse.json();
    assert.equal(ownerReadBody.document.title, "View-only permission test");
  } finally {
    await request(`/api/documents/${document.id}`, aliceCookie, { method: "DELETE" });
  }
});
