export const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg"];

export function getFileExtension(filename) {
  if (!filename) return "";
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return parts[parts.length - 1].toLowerCase();
}

export function validateEvidenceFiles(files, allowed = ALLOWED_EXTENSIONS) {
  const invalid = [];
  for (const file of files) {
    const ext = getFileExtension(file.name || "");
    if (!allowed.includes(ext)) {
      invalid.push(file.name || "unknown");
    }
  }
  return { valid: invalid.length === 0, invalid };
}

export function createReceiptNumber(date = new Date(), rng = Math.random) {
  const pad = (value, size) => String(value).padStart(size, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1, 2);
  const dd = pad(date.getDate(), 2);
  const hh = pad(date.getHours(), 2);
  const mi = pad(date.getMinutes(), 2);
  const ss = pad(date.getSeconds(), 2);
  const random = Math.floor(rng() * 10000);
  return `IA-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${pad(random, 4)}`;
}

export function validateRecommendation(data) {
  const errors = {};

  if (!data.division) errors.division = "부문을 선택하세요.";
  if (!data.recommender_name) errors.recommender_name = "추천자 이름을 입력하세요.";
  if (!data.recommender_dept) errors.recommender_dept = "추천자 부서를 입력하세요.";
  if (!data.nominee_name) errors.nominee_name = "후보자 이름을 입력하세요.";
  if (!data.nominee_dept) errors.nominee_dept = "후보자 부서를 입력하세요.";
  if (!data.reason) errors.reason = "추천 사유를 입력하세요.";
  if (!data.achievement) errors.achievement = "활동 내용을 입력하세요.";

  return { valid: Object.keys(errors).length === 0, errors };
}

export function validateStep(stepIndex, data, files) {
  const requiredByStep = [
    ["division"],
    ["recommender_name", "recommender_dept"],
    ["nominee_name", "nominee_dept"],
    ["reason", "achievement"],
    []
  ];

  const requiredFields = requiredByStep[stepIndex] || [];
  const missing = requiredFields.filter((field) => !data[field]);

  if (missing.length > 0) {
    return {
      valid: false,
      message: "필수 항목을 입력해주세요."
    };
  }

  if (stepIndex === 4) {
    const fileValidation = validateEvidenceFiles(files);
    if (!fileValidation.valid) {
      return {
        valid: false,
        message: `허용되지 않은 파일 형식: ${fileValidation.invalid.join(", ")}`
      };
    }
  }

  return { valid: true, message: "" };
}
