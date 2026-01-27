export function buildEmail(submission) {
  const division = submission.division || "-";
  const nominee = submission.nominee_name || "-";
  const nomineeDept = submission.nominee_dept || "-";
  const recommender = submission.recommender_name || "-";
  const recommenderDept = submission.recommender_dept || "-";
  const reason = submission.reason || "-";
  const achievement = submission.achievement || "-";
  const receipt = submission.receipt_number || "-";
  const files = (submission.evidence_files || []).join(", ") || "첨부 없음";

  const subject = `[Impact Award] ${division} 후보 추천 - ${nominee}`;
  const text = [
    `접수번호: ${receipt}`,
    `부문: ${division}`,
    `후보자: ${nominee} (${nomineeDept})`,
    `추천자: ${recommender} (${recommenderDept})`,
    `추천 사유: ${reason}`,
    `활동 내용: ${achievement}`,
    `증빙 자료: ${files}`
  ].join("\n");

  return { subject, text };
}

export function validateSmtpConfig(env) {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missing = required.filter((key) => !env[key]);
  return { ok: missing.length === 0, missing };
}
