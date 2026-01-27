import { RecommendationService } from "../application/recommendationService.js";
import { validateStep } from "../domain/recommendation.js";
import { LocalStorageGateway } from "../infrastructure/storage.js";

const form = document.querySelector("#recommendation-form");
const steps = Array.from(document.querySelectorAll("[data-step]"));
const stepperItems = Array.from(document.querySelectorAll(".stepper-item"));
const nextButton = document.querySelector("#next-step");
const prevButton = document.querySelector("#prev-step");
const submitButton = document.querySelector("#submit-form");
const saveState = document.querySelector("#save-state");
const stepError = document.querySelector("#step-error");
const summaryPanel = document.querySelector("#summary-panel");
const receiptPanel = document.querySelector("#receipt-panel");
const receiptNumberEl = document.querySelector("#receipt-number");
const pdfButton = document.querySelector("#download-pdf");
const evidenceInput = document.querySelector("#evidence-files");
const stepCountEl = document.querySelector("#step-count");
const stepProgressEl = document.querySelector("#step-progress");
const divisionButtons = Array.from(document.querySelectorAll("[data-division-select]"));

const storage = new LocalStorageGateway();
const service = new RecommendationService({ storage });

let currentStep = 0;
let autoSaveTimer = null;
let lastSaveState = "";

const readFormData = () => ({
  division: form.division.value,
  recommender_name: form.recommender_name.value.trim(),
  recommender_dept: form.recommender_dept.value.trim(),
  recommender_email: form.recommender_email.value.trim(),
  nominee_name: form.nominee_name.value.trim(),
  nominee_dept: form.nominee_dept.value.trim(),
  reason: form.reason.value.trim(),
  achievement: form.achievement.value.trim()
});

const writeFormData = (data) => {
  if (!data) return;
  if (data.division) {
    const radio = form.querySelector(`input[name="division"][value="${data.division}"]`);
    if (radio) radio.checked = true;
  }
  form.recommender_name.value = data.recommender_name || "";
  form.recommender_dept.value = data.recommender_dept || "";
  form.recommender_email.value = data.recommender_email || "";
  form.nominee_name.value = data.nominee_name || "";
  form.nominee_dept.value = data.nominee_dept || "";
  form.reason.value = data.reason || "";
  form.achievement.value = data.achievement || "";
};

const updateSummary = (data, files) => {
  const fileNames = files.map((file) => file.name).join(", ") || "첨부 없음";
  summaryPanel.innerHTML = `
    <div><strong>부문:</strong> ${data.division || "-"}</div>
    <div><strong>추천자:</strong> ${data.recommender_name || "-"} (${data.recommender_dept || "-"})</div>
    <div><strong>이메일:</strong> ${data.recommender_email || "-"}</div>
    <div><strong>후보자:</strong> ${data.nominee_name || "-"} (${data.nominee_dept || "-"})</div>
    <div><strong>추천 사유:</strong> ${data.reason || "-"}</div>
    <div><strong>활동 내용:</strong> ${data.achievement || "-"}</div>
    <div><strong>증빙 자료:</strong> ${fileNames}</div>
  `;
};

const showStep = (index) => {
  steps.forEach((step) => step.classList.add("hidden"));
  steps[index].classList.remove("hidden");
  stepperItems.forEach((item, idx) => {
    item.classList.toggle("active", idx === index);
    item.classList.toggle("done", idx < index);
  });
  prevButton.disabled = index === 0;
  nextButton.classList.toggle("hidden", index === steps.length - 1);
  submitButton.classList.toggle("hidden", index !== steps.length - 1);
  stepError.textContent = "";
  if (stepCountEl) {
    stepCountEl.textContent = `STEP ${index + 1} / ${steps.length}`;
  }
  if (stepProgressEl) {
    const ratio = ((index + 1) / steps.length) * 100;
    stepProgressEl.style.width = `${ratio}%`;
  }
};

const showSaveState = (state) => {
  if (state === lastSaveState) return;
  lastSaveState = state;
  saveState.textContent = state;
};

const scheduleAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  showSaveState("저장 중...");
  autoSaveTimer = setTimeout(() => {
    const data = readFormData();
    service.saveDraft(data);
    showSaveState("자동 저장됨");
  }, 500);
};

const getEvidenceFiles = () => Array.from(evidenceInput.files || []);

const handleNext = () => {
  const data = readFormData();
  const validation = validateStep(currentStep, data, getEvidenceFiles());
  if (!validation.valid) {
    stepError.textContent = validation.message;
    return;
  }
  currentStep += 1;
  updateSummary(data, getEvidenceFiles());
  showStep(currentStep);
};

const handlePrev = () => {
  currentStep = Math.max(0, currentStep - 1);
  showStep(currentStep);
};

const handleSubmit = async (event) => {
  event.preventDefault();
  const data = readFormData();
  const result = service.submitRecommendation(data, getEvidenceFiles());
  if (!result.ok) {
    stepError.textContent = "필수 항목 또는 파일 형식을 확인해주세요.";
    return;
  }

  try {
    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.submission)
    });
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.message || "메일 전송에 실패했습니다.");
    }
  } catch (error) {
    stepError.textContent = `메일 전송 실패: ${error.message}`;
    return;
  }

  receiptNumberEl.textContent = result.receiptNumber;
  receiptPanel.classList.remove("hidden");
  form.reset();
  currentStep = 0;
  showStep(currentStep);
  showSaveState("자동 저장됨");
};

const handlePdfDownload = () => {
  window.print();
};

const handleDivisionSelect = (event) => {
  const { divisionSelect } = event.currentTarget.dataset;
  const radio = form.querySelector(`input[name="division"][value="${divisionSelect}"]`);
  if (radio) radio.checked = true;
  scheduleAutoSave();
  if (currentStep === 0) {
    handleNext();
  }
};

const init = () => {
  const draft = service.loadDraft();
  writeFormData(draft);
  showStep(currentStep);
  updateSummary(readFormData(), getEvidenceFiles());
  showSaveState(draft ? "자동 저장됨" : "저장 전");
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // 서비스 워커 등록 실패는 UX에 영향을 주지 않도록 무시
    });
  }
};

form.addEventListener("input", scheduleAutoSave);
nextButton.addEventListener("click", handleNext);
prevButton.addEventListener("click", handlePrev);
form.addEventListener("submit", handleSubmit);
pdfButton.addEventListener("click", handlePdfDownload);
divisionButtons.forEach((button) => {
  button.addEventListener("click", handleDivisionSelect);
});

init();
