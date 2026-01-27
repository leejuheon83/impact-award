export class LocalStorageGateway {
  constructor(storage = window.localStorage) {
    this.storage = storage;
    this.draftKey = "impact_award_draft";
    this.submissionKey = "impact_award_submissions";
  }

  loadDraft() {
    const raw = this.storage.getItem(this.draftKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  saveDraft(draft) {
    this.storage.setItem(this.draftKey, JSON.stringify(draft));
  }

  clearDraft() {
    this.storage.removeItem(this.draftKey);
  }

  saveSubmission(submission) {
    const raw = this.storage.getItem(this.submissionKey);
    const existing = raw ? JSON.parse(raw) : [];
    existing.push(submission);
    this.storage.setItem(this.submissionKey, JSON.stringify(existing));
  }
}
