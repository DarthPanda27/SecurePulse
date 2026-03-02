import express, { type NextFunction, type Request, type Response } from "express";
import db from "../lib/db";
import crypto from "crypto";

type ErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type Validator = (body: unknown) => string[];

const validateBody = (validator: Validator) => (req: Request, _res: Response, next: NextFunction) => {
  const errors = validator(req.body);
  if (errors.length > 0) {
    return next(new ApiError(400, "VALIDATION_ERROR", "Request payload is invalid", { errors }));
  }
  next();
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

const rateLimit = (bucketName: string) => (req: Request, _res: Response, next: NextFunction) => {
  const rateWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const rateMaxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 5);
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const key = `${bucketName}:${ip}`;
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + rateWindowMs });
    return next();
  }

  if (bucket.count >= rateMaxRequests) {
    return next(new ApiError(429, "RATE_LIMITED", "Too many requests, please retry later"));
  }

  bucket.count += 1;
  next();
};

const validateIntelItem: Validator = (body) => {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return ["Body must be a JSON object"];
  }

  const payload = body as Record<string, unknown>;
  const requiredStringFields = ["source", "externalId", "title", "content", "publishedAt"];
  for (const field of requiredStringFields) {
    if (typeof payload[field] !== "string" || (payload[field] as string).trim() === "") {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  }

  if (payload.url !== undefined && typeof payload.url !== "string") {
    errors.push("url must be a string when provided");
  }

  return errors;
};

const validateIntelUpdate: Validator = (body) => {
  const errors: string[] = [];
  if (!body || typeof body !== "object") {
    return ["Body must be a JSON object"];
  }

  const payload = body as Record<string, unknown>;
  const allowed = ["source", "externalId", "title", "content", "publishedAt", "url"];
  const keys = Object.keys(payload);
  if (keys.length === 0) {
    return ["At least one field is required"];
  }

  for (const key of keys) {
    if (!allowed.includes(key)) {
      errors.push(`${key} is not a supported field`);
      continue;
    }

    if (payload[key] !== undefined && typeof payload[key] !== "string") {
      errors.push(`${key} must be a string when provided`);
    }
  }

  return errors;
};

const insertIntel = db.prepare(`
  INSERT INTO intel_items (id, source, external_id, title, content, url, published_at)
  VALUES (@id, @source, @externalId, @title, @content, @url, @publishedAt)
`);

const updateIntel = db.prepare(`
  UPDATE intel_items SET
    source = COALESCE(@source, source),
    external_id = COALESCE(@externalId, external_id),
    title = COALESCE(@title, title),
    content = COALESCE(@content, content),
    url = COALESCE(@url, url),
    published_at = COALESCE(@publishedAt, published_at)
  WHERE id = @id
`);

const deleteIntel = db.prepare(`DELETE FROM intel_items WHERE id = ?`);
const listIntel = db.prepare(`SELECT * FROM intel_items ORDER BY created_at DESC LIMIT 50`);

const writeAudit = db.prepare(`
  INSERT INTO audit_logs (id, operation, entity, entity_id, actor, metadata)
  VALUES (@id, @operation, @entity, @entityId, @actor, @metadata)
`);

function auditLog(req: Request, operation: "create" | "update" | "delete", entityId: string, metadata: Record<string, unknown>) {
  const actor = req.header("x-actor-id") || "system";
  const entry = {
    id: crypto.randomUUID(),
    operation,
    entity: "intel_item",
    entityId,
    actor,
    metadata: JSON.stringify(metadata),
  };

  writeAudit.run(entry);
  console.info("audit_log", { ...entry, metadata });
}

function metricsSnapshot() {
  const intelCount = db.prepare("SELECT COUNT(*) as count FROM intel_items").get() as { count: number };
  const auditCount = db.prepare("SELECT COUNT(*) as count FROM audit_logs").get() as { count: number };

  return {
    app: "SecurePulse",
    uptimeSeconds: Math.floor(process.uptime()),
    intelItemCount: intelCount.count,
    auditLogCount: auditCount.count,
  };
}

function requireOpsToken(req: Request, _res: Response, next: NextFunction) {
  const expectedToken = process.env.OPS_TOKEN;
  if (!expectedToken) {
    return next(new ApiError(503, "OPS_DISABLED", "Operations endpoint is not configured"));
  }

  if (req.header("x-ops-token") !== expectedToken) {
    return next(new ApiError(401, "UNAUTHORIZED", "Invalid operations token"));
  }

  next();
}

function sendError(err: unknown, _req: Request, res: Response<ErrorEnvelope>, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
    },
  });
}

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ data: { status: "ok", app: "SecurePulse MVP" } });
  });

  app.get("/api/intel", (_req, res) => {
    res.json({ data: listIntel.all() });
  });

  app.post("/api/intel", rateLimit("intel-write"), validateBody(validateIntelItem), (req, res, next) => {
    try {
      const payload = req.body as Record<string, string>;
      const id = crypto.randomUUID();
      insertIntel.run({
        id,
        source: payload.source,
        externalId: payload.externalId,
        title: payload.title,
        content: payload.content,
        url: payload.url || null,
        publishedAt: payload.publishedAt,
      });

      auditLog(req, "create", id, { source: payload.source, externalId: payload.externalId });
      res.status(201).json({ data: { id } });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/intel/:id", rateLimit("intel-write"), validateBody(validateIntelUpdate), (req, res, next) => {
    try {
      const id = req.params.id;
      const payload = req.body as Record<string, string>;
      const result = updateIntel.run({ id, ...payload });
      if (result.changes === 0) {
        throw new ApiError(404, "NOT_FOUND", "Intel item not found");
      }

      auditLog(req, "update", id, { fields: Object.keys(payload) });
      res.json({ data: { id, updated: true } });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/intel/:id", rateLimit("intel-write"), (req, res, next) => {
    try {
      const id = req.params.id;
      const result = deleteIntel.run(id);
      if (result.changes === 0) {
        throw new ApiError(404, "NOT_FOUND", "Intel item not found");
      }

      auditLog(req, "delete", id, {});
      res.json({ data: { id, deleted: true } });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/ops/metrics", requireOpsToken, (_req, res) => {
    res.json({ data: metricsSnapshot() });
  });

  app.use(sendError);

  return app;
}

export function resetRateLimits() {
  rateBuckets.clear();
}
