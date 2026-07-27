// api/intent.js — Node serverless (Vercel-style)
// The ONLY thing that touches the database. The browser never sees the URI.
import { MongoClient } from "mongodb";
import { createHash } from "crypto";

const uri = process.env.MONGODB_URI;
// Salt keeps stored IP hashes non-reversible. Set IP_HASH_SALT in prod.
const IP_SALT = process.env.IP_HASH_SALT || "pestren-intent";
function hashIp(ip) {
  return createHash("sha256").update(IP_SALT + "|" + ip).digest("hex");
}

const SANCTIONED = new Set([
  "north korea", "iran", "syria", "cuba", "russia", "belarus",
  "myanmar", "venezuela", "afghanistan",
]); // confirm with counsel; export-control driven

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Reuse the connection across warm invocations.
let clientPromise;
function getClient() {
  if (!uri) throw new Error("MONGODB_URI is not set");
  if (!clientPromise) clientPromise = new MongoClient(uri).connect();
  return clientPromise;
}

// Crude in-memory per-IP limiter (survives only within a warm instance,
// but stops casual spam). Swap for Upstash Ratelimit for real durability.
const HITS = new Map(); // ip -> { count, ts }
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
function rateLimited(ip) {
  const now = Date.now();
  const rec = HITS.get(ip);
  if (!rec || now - rec.ts > WINDOW_MS) {
    HITS.set(ip, { count: 1, ts: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_PER_WINDOW;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";
  if (rateLimited(ip)) return res.status(429).json({ error: "too_many_requests" });

  try {
    // Body may arrive as a string depending on host/runtime.
    let b = req.body || {};
    if (typeof b === "string") {
      try { b = JSON.parse(b); } catch { b = {}; }
    }

    // Honeypot: a hidden field bots fill in. If present, pretend success.
    if (b.website) return res.status(200).json({ ok: true });

    const country = String(b.country || "").trim();
    const feedback = String(b.feedback || "").trim();
    if (!country || feedback.length < 2)
      return res.status(422).json({ error: "missing_fields" });
    if (SANCTIONED.has(country.toLowerCase()))
      return res.status(403).json({ error: "region_unavailable" });

    const newsletter = b.newsletter === true;
    const ipHash = ip !== "unknown" ? hashIp(ip) : null;
    const doc = {
      country,
      availabilityTier: b.availabilityTier === "priority" ? "priority" : "expanding",
      sentiment: b.sentiment || null,
      feedback: feedback.slice(0, 800),
      newsletter,
      // email is written ONLY if they opted in AND it's valid — never otherwise
      ...(newsletter && EMAIL_RE.test(String(b.email || "").trim())
        ? { email: String(b.email).trim().toLowerCase() }
        : {}),
      ...(ipHash ? { ipHash } : {}),
      createdAt: new Date(),
    };

    const client = await getClient();
    const collection = client.db("pestren").collection("intent");

    // One submission per IP. Unique index makes this race-safe; the findOne is
    // a fast path so we usually skip the insert attempt entirely.
    if (ipHash) {
      await collection.createIndex(
        { ipHash: 1 },
        { unique: true, partialFilterExpression: { ipHash: { $exists: true } } }
      );
      const existing = await collection.findOne({ ipHash }, { projection: { _id: 1 } });
      if (existing) return res.status(409).json({ error: "already_submitted" });
    }

    try {
      await collection.insertOne(doc);
    } catch (err) {
      // 11000 = duplicate key: another request from this IP won the race.
      if (err && err.code === 11000)
        return res.status(409).json({ error: "already_submitted" });
      throw err;
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("intent error", e);
    return res.status(500).json({ error: "server" });
  }
}
