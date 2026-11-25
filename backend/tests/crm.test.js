import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv, toCsv, sanitizeCsvCell } from "../utils/csv.js";
import { computePipelineForecast } from "../controllers/dealController.js";
import { escapeRegex, isValidEmail, isValidObjectId, parsePagination } from "../middleware/validate.js";
import { createRateLimiter } from "../middleware/security.js";

test("CSV serializer neutralizes formula injection and escapes quotes/newlines", () => {
  assert.equal(sanitizeCsvCell("=CMD()"), "'=CMD()");
  assert.equal(sanitizeCsvCell("+1234"), "'+1234");
  assert.equal(sanitizeCsvCell("-SUM(A1)"), "'-SUM(A1)");
  assert.equal(sanitizeCsvCell("@mention"), "'@mention");
  assert.equal(sanitizeCsvCell('Acme, "Inc"'), '"Acme, ""Inc"""');

  const csv = toCsv(
    [
      { key: "name", label: "name" },
      { key: "note", label: "note" },
    ],
    [{ name: "Abebe", note: "=1+1" }]
  );
  assert.equal(csv, "name,note\r\nAbebe,'=1+1");
});

test("CSV parser handles quoted commas, escaped quotes, and BOM", () => {
  const raw = '\uFEFFclientName,companyName,estimatedValue\r\n"Abebe, K.","Acme ""Pro"" PLC",5000\r\nSara,Beta,2500';
  const rows = parseCsv(raw);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].clientName, "Abebe, K.");
  assert.equal(rows[0].companyName, 'Acme "Pro" PLC');
  assert.equal(rows[0].estimatedValue, "5000");
  assert.equal(rows[1].clientName, "Sara");
});

test("computePipelineForecast computes open pipeline, weighted forecast, won revenue, and win rate", () => {
  const forecast = computePipelineForecast([
    { stage: "qualified", amount: 10000, probability: 20 },
    { stage: "negotiation", amount: 20000, probability: 80 },
    { stage: "closed_won", amount: 15000, probability: 100 },
    { stage: "closed_lost", amount: 5000, probability: 0 },
  ]);

  assert.equal(forecast.totalDeals, 4);
  assert.equal(forecast.openCount, 2);
  assert.equal(forecast.wonCount, 1);
  assert.equal(forecast.lostCount, 1);
  assert.equal(forecast.openPipelineValue, 30000);
  assert.equal(forecast.weightedForecast, 18000);
  assert.equal(forecast.wonRevenue, 15000);
  assert.equal(forecast.winRate, 50);
});

test("Validation helpers escape regex, validate emails, objectIds, and clamp pagination", () => {
  assert.equal(escapeRegex("a.b+c*(test)"), "a\\.b\\+c\\*\\(test\\)");
  assert.equal(isValidEmail("user@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.equal(isValidObjectId("invalid-id"), false);

  const p = parsePagination({ page: "-3", limit: "999" }, 20, 100);
  assert.deepEqual(p, { page: 1, limit: 100, skip: 0 });
});

test("Rate limiter allows requests within quota and blocks excess with 429", () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2, message: "Blocked" });
  const makeRes = () => {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.body = payload; return this; },
    };
    return res;
  };

  let nextCalls = 0;
  const req = { ip: "127.0.0.1", baseUrl: "/api/auth" };

  limiter(req, makeRes(), () => { nextCalls += 1; });
  limiter(req, makeRes(), () => { nextCalls += 1; });

  const blockedRes = makeRes();
  limiter(req, blockedRes, () => { nextCalls += 1; });

  assert.equal(nextCalls, 2);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.body.success, false);
});
