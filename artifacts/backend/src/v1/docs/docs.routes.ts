import { Router } from "express";
import { openApiDocument } from "./openapi";

const router = Router();

router.get("/docs.json", (_req, res) => res.json(openApiDocument));
router.get("/docs", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html>
  <head>
    <title>Wandr API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>SwaggerUIBundle({ url: "/api/v1/docs.json", dom_id: "#swagger-ui" })</script>
  </body>
</html>`);
});

export default router;
