export const authSwaggerPaths: Record<string, unknown> = {
  "/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Register a new user",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "mobile", "password"],
              properties: {
                name: { type: "string", minLength: 2, maxLength: 100 },
                email: { type: "string", format: "email" },
                mobile: { type: "string", minLength: 10, maxLength: 20 },
                password: { type: "string", minLength: 8, maxLength: 72 },
              },
            },
          },
        },
      },
      responses: {
        "201": {
          description:
            "User successfully registered (Returns user info without tokens)",
        },
        "409": {
          description: "Email or mobile already registered",
        },
      },
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login with email or mobile",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["identifier", "password"],
              properties: {
                identifier: {
                  type: "string",
                  description: "Email address or Mobile number",
                },
                password: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        "200": {
          description:
            "Successfully authenticated (Returns user info and JWT tokens)",
        },
        "401": {
          description: "Invalid credentials",
        },
      },
    },
  },
};
