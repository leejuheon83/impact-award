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
const printSubmitButton = document.querySelector("#print-submit");
const printStatus = document.querySelector("#print-status");
const evidenceInput = document.querySelector("#evidence-files");
const stepCountEl = document.querySelector("#step-count");
const stepProgressEl = document.querySelector("#step-progress");
const divisionButtons = Array.from(document.querySelectorAll("[data-division-select]"));

const storage = new LocalStorageGateway();
const service = new RecommendationService({ storage });
let lastSubmission = null;

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

const setPrintStatus = (message) => {
  if (printStatus) {
    printStatus.textContent = message;
  }
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

const buildPrintableHtml = (submission) => `
  <style>
    @page { margin: 24mm; }
    .print-wrap { font-family: "Noto Sans KR", "Segoe UI", Arial, sans-serif; color: #1b1b1b; break-inside: avoid-page; page-break-inside: avoid; }
    .print-header { text-align: left; margin-bottom: 24px; }
    .print-header-title { font-size: 22px; font-weight: 700; }
    .print-content { margin-bottom: 50px; }
    .print-title { margin: 0 0 16px; font-size: 22px; }
    .print-meta { color: #5f6b7a; font-size: 12px; margin-bottom: 24px; }
    .print-row { margin-bottom: 10px; }
    .print-label { font-weight: 700; display: inline-block; min-width: 120px; }
    .print-footer { text-align: right; margin-top: 60px; }
    .print-date { margin-bottom: 12px; letter-spacing: 6px; }
    .print-sign { margin-top: 12px; }
  </style>
  <div class="print-wrap">
    <div class="print-header">
      <div class="print-header-title">SBS M&amp;C</div>
    </div>
    <div class="print-content">
      <h1 class="print-title">Impact Award 추천서</h1>
      <div class="print-meta">접수번호: ${submission.receipt_number || "-"}</div>
      <div class="print-row"><span class="print-label">부문</span>${submission.division || "-"}</div>
      <div class="print-row"><span class="print-label">추천자</span>${submission.recommender_name || "-"} (${submission.recommender_dept || "-"})</div>
      <div class="print-row"><span class="print-label">이메일</span>${submission.recommender_email || "-"}</div>
      <div class="print-row"><span class="print-label">후보자</span>${submission.nominee_name || "-"} (${submission.nominee_dept || "-"})</div>
      <div class="print-row"><span class="print-label">추천 사유</span>${submission.reason || "-"}</div>
      <div class="print-row"><span class="print-label">활동 내용</span>${submission.achievement || "-"}</div>
      <div class="print-row"><span class="print-label">증빙 자료</span>${(submission.evidence_files || []).join(", ") || "첨부 없음"}</div>
      <div class="print-row">본 직원을 Impact Award 수상자로 추천합니다.</div>
    </div>
    <div class="print-footer">
      <div class="print-date">년&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;월&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;일</div>
      <div class="print-sign">성명:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;(서명)</div>
    </div>
  </div>
`;

const html2pdfFallback = async (submission, onComplete) => {
  if (!window.html2pdf) {
    setPrintStatus("PDF 모듈 로딩 실패로 저장을 건너뜁니다.");
    if (onComplete) onComplete();
    return;
  }
  setPrintStatus("PDF로 저장을 시도합니다...");
  const printArea = document.querySelector("#print-area");
  if (!printArea) {
    setPrintStatus("출력 영역을 찾을 수 없습니다.");
    if (onComplete) onComplete();
    return;
  }
  printArea.innerHTML = buildPrintableHtml(submission);
  const safeName = (submission.nominee_name || "추천서").replace(/\s+/g, "_");
  const filename = `ImpactAward_${safeName}_${submission.receipt_number || "draft"}.pdf`;
  try {
    await window
      .html2pdf()
      .set({
        filename,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      })
      .from(printArea)
      .save();
    setPrintStatus("PDF 저장이 완료되었습니다.");
  } finally {
    printArea.innerHTML = "";
    if (onComplete) onComplete();
  }
};

const printFallback = (submission, onComplete) => {
  const printArea = document.querySelector("#print-area");
  if (!printArea) {
    setPrintStatus("출력 영역을 찾을 수 없습니다.");
    return;
  }
  printArea.innerHTML = buildPrintableHtml(submission);
  const finalize = () => {
    printArea.innerHTML = "";
    window.removeEventListener("afterprint", finalize);
    if (onComplete) onComplete();
  };
  window.addEventListener("afterprint", finalize);
  window.print();
  setTimeout(() => {
    finalize();
    html2pdfFallback(submission);
  }, 1200);
};

const downloadRecommendation = (submission, onComplete) => {
  const printArea = document.querySelector("#print-area");
  if (!printArea) {
    stepError.textContent = "출력 영역을 찾을 수 없습니다.";
    return;
  }
  setPrintStatus("출력 창을 여는 중입니다...");
  printFallback(submission, onComplete);
};

const handleSubmit = (event) => {
  event.preventDefault();
  const data = readFormData();
  const result = service.submitRecommendation(data, getEvidenceFiles());
  if (!result.ok) {
    stepError.textContent = "필수 항목 또는 파일 형식을 확인해주세요.";
    return;
  }

  lastSubmission = result.submission;
  setPrintStatus("");
  downloadRecommendation(result.submission, () => {
    receiptNumberEl.textContent = result.receiptNumber;
    receiptPanel.classList.remove("hidden");
    form.reset();
    currentStep = 0;
    showStep(currentStep);
    showSaveState("자동 저장됨");
  });
};
const handlePrintSubmit = () => {
  if (!lastSubmission) {
    stepError.textContent = "출력할 데이터가 없습니다.";
    return;
  }
  setPrintStatus("");
  downloadRecommendation(lastSubmission);
};

const handlePdfDownload = () => {
  if (!lastSubmission) {
    stepError.textContent = "저장할 데이터가 없습니다.";
    return;
  }
  setPrintStatus("");
  downloadRecommendation(lastSubmission);
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
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    });
  }
};

form.addEventListener("input", scheduleAutoSave);
nextButton.addEventListener("click", handleNext);
prevButton.addEventListener("click", handlePrev);
form.addEventListener("submit", handleSubmit);
submitButton.addEventListener("click", handleSubmit);
pdfButton.addEventListener("click", handlePdfDownload);
divisionButtons.forEach((button) => {
  button.addEventListener("click", handleDivisionSelect);
});

// 동적으로 생성되는 버튼도 동작하도록 이벤트 위임 처리
document.addEventListener("click", (event) => {
  if (event.target?.id === "print-submit") {
    handlePrintSubmit();
  }
});

init();
