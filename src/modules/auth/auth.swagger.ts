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
              required: ["name", "email", "password"],
              properties: {
                name: { type: "string", minLength: 2, maxLength: 100 },
                email: { type: "string", format: "email" },
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
          description: "Email already registered",
        },
      },
    },
  },
  "/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Login with email",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: {
                  type: "string",
                  description: "Email address",
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
            "Successfully authenticated (Returns user info and sets JWT cookies)",
          headers: {
            "Set-Cookie": {
              description: "x-access-token (accessible to client scripts) and x-refresh-token (HttpOnly)",
              schema: {
                type: "string"
              }
            }
          }
        },
        "401": {
          description: "Invalid credentials",
        },
      },
    },
  },
};
