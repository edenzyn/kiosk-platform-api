export const notificationSwaggerPaths: Record<string, unknown> = {
  "/webhooks/whatsapp": {
    get: {
      tags: ["Notifications"],
      summary: "Verify the WhatsApp webhook (Meta subscribe handshake)",
      description:
        "Called by Meta when the callback URL is registered/re-verified in the App Dashboard. Echoes back `hub.challenge` as plain text if `hub.mode=subscribe` and `hub.verify_token` matches `META_WHATSAPP_VERIFY_TOKEN`.",
      security: [],
      parameters: [
        { name: "hub.mode", in: "query", required: true, schema: { type: "string", example: "subscribe" } },
        { name: "hub.verify_token", in: "query", required: true, schema: { type: "string" } },
        { name: "hub.challenge", in: "query", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "Token matched; returns the raw `hub.challenge` value as plain text.",
          content: { "text/plain": { schema: { type: "string" } } },
        },
        "403": { description: "Mode or verify token did not match" },
      },
    },
    post: {
      tags: ["Notifications"],
      summary: "Receive a WhatsApp webhook event",
      description:
        "Meta POSTs message/status events here, signed with `X-Hub-Signature-256` (HMAC-SHA256 over the raw body using `META_WHATSAPP_APP_SECRET`). Verified events are processed inline and acknowledged.",
      security: [],
      parameters: [
        {
          name: "X-Hub-Signature-256",
          in: "header",
          required: true,
          schema: { type: "string", example: "sha256=..." },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { type: "object", description: "Meta's WhatsApp Cloud API webhook payload" },
          },
        },
      },
      responses: {
        "200": { description: "Signature verified and event processed" },
        "401": { description: "Missing or invalid signature" },
      },
    },
  },
};
