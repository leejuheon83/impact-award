import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { buildEmail, validateSmtpConfig } from "../src/domain/email.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const recipientEmail = "juheonlee@sbs.co.kr";

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString();
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });

const createTransport = () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  const configCheck = validateSmtpConfig({ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS });
  if (!configCheck.ok) {
    return { ok: false, message: `SMTP 설정 누락: ${configCheck.missing.join(", ")}` };
  }

  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  return { ok: true, transport };
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url || "/");
  const safePath = urlPath.split("?")[0];

  if (req.method === "POST" && safePath === "/api/submit") {
    readBody(req)
      .then((body) => {
        const submission = JSON.parse(body || "{}");
        const transportResult = createTransport();
        if (!transportResult.ok) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, message: transportResult.message }));
          return;
        }

        const mail = buildEmail(submission);
        transportResult.transport
          .sendMail({
            from: process.env.SMTP_USER,
            to: recipientEmail,
            subject: mail.subject,
            text: mail.text
          })
          .then(() => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true }));
          })
          .catch((error) => {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, message: error.message }));
          });
      })
      .catch(() => {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, message: "잘못된 요청입니다." }));
      });
    return;
  }

  const resolved = path.normalize(path.join(rootDir, safePath));

  if (!resolved.startsWith(rootDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const filePath = resolved.endsWith(path.sep)
    ? path.join(resolved, "index.html")
    : resolved;

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`Impact Award server running at http://${host}:${port}`);
});
