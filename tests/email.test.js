import assert from "node:assert/strict";
import { buildEmail, validateSmtpConfig } from "../src/domain/email.js";

export default function registerEmailTests(test) {
  test("buildEmail creates subject and body", () => {
    const result = buildEmail({
      division: "MoonShot",
      nominee_name: "홍길동",
      nominee_dept: "디지털전략팀",
      recommender_name: "김혜린",
      recommender_dept: "경영기획팀",
      reason: "성과 인정",
      achievement: "신규 프로젝트",
      receipt_number: "IA-20260101-120000-0001",
      evidence_files: ["report.pdf"]
    });

    assert.ok(result.subject.includes("MoonShot"));
    assert.ok(result.subject.includes("홍길동"));
    assert.ok(result.text.includes("접수번호"));
    assert.ok(result.text.includes("report.pdf"));
  });

  test("validateSmtpConfig detects missing values", () => {
    const result = validateSmtpConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "",
      SMTP_USER: "user",
      SMTP_PASS: ""
    });

    assert.equal(result.ok, false);
    assert.deepEqual(result.missing, ["SMTP_PORT", "SMTP_PASS"]);
  });
}
