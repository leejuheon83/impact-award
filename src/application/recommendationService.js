import { createReceiptNumber, validateEvidenceFiles, validateRecommendation } from "../domain/recommendation.js";

export class RecommendationService {
  constructor({ storage }) {
    this.storage = storage;
  }

  loadDraft() {
    return this.storage.loadDraft();
  }

  saveDraft(draft) {
    this.storage.saveDraft(draft);
  }

  submitRecommendation(data, files) {
    const validation = validateRecommendation(data);
    if (!validation.valid) {
      return { ok: false, errors: validation.errors };
    }

    const fileValidation = validateEvidenceFiles(files);
    if (!fileValidation.valid) {
      return { ok: false, errors: { evidence_files: fileValidation.invalid } };
    }

    const receiptNumber = createReceiptNumber();
    const submission = {
      ...data,
      evidence_files: files.map((file) => file.name || "unknown"),
      receipt_number: receiptNumber,
      submitted_at: new Date().toISOString()
    };

    this.storage.saveSubmission(submission);
    this.storage.clearDraft();

    return { ok: true, receiptNumber, submission };
  }
}
