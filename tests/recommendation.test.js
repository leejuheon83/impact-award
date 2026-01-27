import assert from "node:assert/strict";
import {
  ALLOWED_EXTENSIONS,
  createReceiptNumber,
  getFileExtension,
  validateEvidenceFiles,
  validateRecommendation
} from "../src/domain/recommendation.js";

export default function registerTests(test) {
  test("getFileExtension extracts extension", () => {
    assert.equal(getFileExtension("file.pdf"), "pdf");
    assert.equal(getFileExtension("report.PNG"), "png");
    assert.equal(getFileExtension("noext"), "");
  });

  test("validateEvidenceFiles rejects unsupported files", () => {
    const files = [{ name: "a.pdf" }, { name: "b.exe" }];
    const result = validateEvidenceFiles(files, ALLOWED_EXTENSIONS);
    assert.equal(result.valid, false);
    assert.deepEqual(result.invalid, ["b.exe"]);
  });

  test("createReceiptNumber uses predictable format", () => {
    const fixedDate = new Date(2026, 0, 26, 9, 15, 30);
    const result = createReceiptNumber(fixedDate, () => 0.1234);
    assert.ok(result.startsWith("IA-20260126-091530-"));
  });

  test("validateRecommendation identifies missing fields", () => {
    const result = validateRecommendation({
      division: "",
      recommender_name: "",
      recommender_dept: "",
      nominee_name: "",
      nominee_dept: "",
      reason: "",
      achievement: ""
    });
    assert.equal(result.valid, false);
    assert.ok(result.errors.division);
    assert.ok(result.errors.recommender_name);
    assert.ok(result.errors.nominee_name);
  });
}
