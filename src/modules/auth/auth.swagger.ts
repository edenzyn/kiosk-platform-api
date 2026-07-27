export const authSwaggerPaths: Record<string, unknown> = {
  "/auth/status": {
    get: {
      tags: ["Auth"],
      summary: "Get auth module status",
      responses: {
        "200": {
          description: "Auth module is available",
        },
      },
    },
  },
};
