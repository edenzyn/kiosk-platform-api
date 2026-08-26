const exchangeRatesOperation = {
  tags: ["Finance"],
  summary: "Get the latest cached currency exchange rates",
  description:
    "Returns the most recently cached exchange-rate table, sourced from Frankfurter/ECB and refreshed on a daily schedule. Display-only currency conversion - not used for payment processing.",
  responses: {
    "200": {
      description: "Latest cached exchange rates",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              base: {
                type: "string",
                description: "Currency every rate is quoted against",
                example: "INR",
              },
              rates: {
                type: "object",
                additionalProperties: { type: "number" },
                example: { USD: 0.0114, EUR: 0.0097 },
              },
              rateDate: {
                type: "string",
                format: "date",
                description: "Date the provider published this rate for",
              },
              fetchedAt: {
                type: "string",
                format: "date-time",
                description: "When our server cached this rate",
              },
            },
          },
        },
      },
    },
    "401": { $ref: "#/components/responses/Unauthorized" },
    "403": { $ref: "#/components/responses/Forbidden" },
    "503": {
      description:
        "No exchange rates cached yet and the provider is unavailable",
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/ErrorResponse" },
        },
      },
    },
  },
};

// Same operation, mounted separately per actor type - each client type
// calls it from its own axios instance/route namespace rather than a
// shared cross-actor path, so the docs mirror that per-prefix mounting.
export const financeSwaggerPaths: Record<string, unknown> = {
  "/pvt/u/finance/exchange-rates": { get: exchangeRatesOperation },
  "/pvt/p/finance/exchange-rates": { get: exchangeRatesOperation },
  "/pvt/r/finance/exchange-rates": { get: exchangeRatesOperation },
};
