// Native Web Push (RFC 8291 + RFC 8292) for Supabase Edge Runtime.
// No Node.js crypto, npm modules, or external imports.
const env = (name: string) => Deno.env.get(name) || "";
const url = env("SUPABASE_URL");
const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
const publicKey = env("VAPID_PUBLIC_KEY");
const privateKey = env("VAPID_PRIVATE_KEY");
const subject = env("VAPID_SUBJECT");
const secret = env("ISYS_WEBHOOK_SECRET");
const enc = new TextEncoder();
const cryptoApi = globalThis.crypto;
const cors = {
  "access-control-allow-origin": "https://jakubjirijuren-pixel.github.io",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization,apikey,content-type,x-client-info",
};
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...cors, "content-type": "application/json" },
});
const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
};
const decode64 = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};
const encode64url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const hkdf = async (ikm: Uint8Array, salt: Uint8Array, info: Uint8Array, length: number) => {
  const key = await cryptoApi.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await cryptoApi.subtle.deriveBits({
    name: "HKDF", hash: "SHA-256", salt, info,
  }, key, length * 8));
};
const vapidToken = async (endpoint: string) => {
  const publicBytes = decode64(publicKey);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) throw new Error("Invalid VAPID public key");
  const key = await cryptoApi.subtle.importKey("jwk", {
    kty: "EC", crv: "P-256",
    x: encode64url(publicBytes.slice(1, 33)),
    y: encode64url(publicBytes.slice(33, 65)),
    d: privateKey, ext: false,
  }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = encode64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = encode64url(enc.encode(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: subject,
  })));
  const unsigned = `${header}.${claims}`;
  const signature = new Uint8Array(await cryptoApi.subtle.sign({
    name: "ECDSA", hash: "SHA-256",
  }, key, enc.encode(unsigned)));
  return `${unsigned}.${encode64url(signature)}`;
};
type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };
const encryptPayload = async (subscription: Subscription, payload: string) => {
  const receiverPublic = decode64(subscription.p256dh);
  const authSecret = decode64(subscription.auth);
  if (receiverPublic.length !== 65 || receiverPublic[0] !== 4 || authSecret.length !== 16) {
    throw new Error("Invalid push subscription keys");
  }
  const receiver = await cryptoApi.subtle.importKey("raw", receiverPublic, {
    name: "ECDH", namedCurve: "P-256",
  }, false, []);
  const sender = await cryptoApi.subtle.generateKey({
    name: "ECDH", namedCurve: "P-256",
  }, true, ["deriveBits"]);
  const senderPublic = new Uint8Array(await cryptoApi.subtle.exportKey("raw", sender.publicKey));
  const shared = new Uint8Array(await cryptoApi.subtle.deriveBits({
    name: "ECDH", public: receiver,
  }, sender.privateKey, 256));
  const info = concat(enc.encode("WebPush: info\0"), receiverPublic, senderPublic);
  const ikm = await hkdf(shared, authSecret, info, 32);
  const salt = cryptoApi.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(ikm, salt, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(ikm, salt, enc.encode("Content-Encoding: nonce\0"), 12);
  const aesKey = await cryptoApi.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // RFC 8188: one final record (delimiter 0x02), padded by AES-GCM.
  const plaintext = concat(enc.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await cryptoApi.subtle.encrypt({
    name: "AES-GCM", iv: nonce, tagLength: 128,
  }, aesKey, plaintext));
  const recordHeader = new Uint8Array(5);
  new DataView(recordHeader.buffer).setUint32(0, 4096, false);
  recordHeader[4] = senderPublic.length;
  return concat(salt, recordHeader, senderPublic, ciphertext);
};
const dbGet = async <T>(table: string, query: string): Promise<T> => {
  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) throw new Error(`Database ${table} HTTP ${response.status}`);
  return await response.json() as T;
};
const dbDelete = async (table: string, id: string) => {
  const response = await fetch(`${url}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}` },
  });
  if (!response.ok) console.error("Failed to delete expired push subscription", response.status);
};
const sendPush = async (subscription: Subscription, payload: string) => {
  const endpoint = new URL(subscription.endpoint);
  if (endpoint.protocol !== "https:") throw new Error("Invalid push endpoint protocol");
  const encrypted = await encryptPayload(subscription, payload);
  const token = await vapidToken(subscription.endpoint);
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "TTL": "3600",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "Authorization": `vapid t=${token}, k=${publicKey}`,
    },
    body: encrypted,
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Push service HTTP ${response.status}`), { statusCode: response.status });
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method === "GET") return json({ publicKey });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!secret || req.headers.get("x-isys-webhook-secret") !== secret) return json({ error: "Unauthorized" }, 401);
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) return json({ error: "Missing configuration" }, 500);
  let payload: { type?: string; table?: string; schema?: string; record?: { id?: string; user_id?: string } };
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (payload.type !== "INSERT" || payload.table !== "notifications" || payload.schema !== "public") {
    return json({ error: "Unsupported event" }, 400);
  }
  const record = payload.record;
  if (!record?.id || !record.user_id) return json({ error: "Missing notification" }, 400);
  try {
    const notifications = await dbGet<Array<{ id: string; user_id: string; title: string; body: string; module: string }>>(
      "notifications", `select=id,user_id,title,body,module&id=eq.${encodeURIComponent(record.id)}&user_id=eq.${encodeURIComponent(record.user_id)}&limit=1`,
    );
    const notification = notifications[0];
    if (!notification) return json({ error: "Notification not found" }, 404);
    const subscriptions = await dbGet<Subscription[]>(
      "push_subscriptions", `select=id,endpoint,p256dh,auth&user_id=eq.${encodeURIComponent(notification.user_id)}`,
    );
    const body = JSON.stringify({
      title: notification.title, body: notification.body,
      module: notification.module || "Přehled", notificationId: notification.id, url: "/isys/",
    });
    let sent = 0, expired = 0, failed = 0;
    for (const sub of subscriptions) {
      try {
        await sendPush(sub, body);
        sent++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await dbDelete("push_subscriptions", sub.id);
          expired++;
        } else {
          failed++;
          console.error("Web Push delivery failed", {
            status: status || null,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
    console.log("Web Push result", { sent, expired, failed });
    return json({ sent, expired, failed }, failed ? 502 : 200);
  } catch (error) {
    console.error("Web Push handler failed", error instanceof Error ? error.message : String(error));
    return json({ error: "Internal error" }, 500);
  }
});
