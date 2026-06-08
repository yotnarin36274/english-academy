import type { Student, Assignment, FeedbackRow } from './db';

export async function sendLineNotify(token: string, message: string): Promise<boolean> {
  try {
    const res = await fetch('/api/notify/line', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, message }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function buildNewAssignmentMessage(student: Student, assignment: Assignment, baseUrl: string): string {
  const due = assignment.due_date
    ? new Date(assignment.due_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'ไม่ระบุ';
  return `📚 ENG SPARK — การบ้านใหม่
━━━━━━━━━━━━━━━━━
น้อง${student.nickname} (${student.grade}) มีการบ้านใหม่ครับ

📝 งาน: ${assignment.title}
${assignment.description ? `รายละเอียด: ${assignment.description}\n` : ''}📅 ครบกำหนด: ${due}
🏆 คะแนนเต็ม: ${assignment.max_score} คะแนน

ติดตามพัฒนาการน้องได้ที่:
${baseUrl}/parent/${student.parent_token}

— ครูภาษาอังกฤษ ENG SPARK`;
}

export function buildFeedbackMessage(student: Student, assignment: Assignment, fb: FeedbackRow, baseUrl: string): string {
  const pct = fb.score != null ? Math.round((fb.score / fb.max_score) * 100) : null;
  const emoji = pct == null ? '✅' : pct >= 80 ? '🌟' : pct >= 60 ? '✅' : '📈';
  return `${emoji} ENG SPARK — ผลตรวจการบ้าน
━━━━━━━━━━━━━━━━━
น้อง${student.nickname} (${student.grade})

📝 งาน: ${assignment.title}
${fb.score != null ? `🏆 คะแนน: ${fb.score}/${fb.max_score} (${pct}%)\n` : ''}${fb.comment ? `💬 ความเห็นครู:\n${fb.comment}\n` : ''}
ดูรายละเอียดและพัฒนาการน้องได้ที่:
${baseUrl}/parent/${student.parent_token}

— ครูภาษาอังกฤษ ENG SPARK`;
}

export function buildFacebookTemplate(student: Student, assignment: Assignment, fb: FeedbackRow, baseUrl: string): string {
  return buildFeedbackMessage(student, assignment, fb, baseUrl);
}
