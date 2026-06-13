import type { Student, Assignment, FeedbackRow, ClassSession } from './db';

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

export function buildAbsentMessage(student: Student, session: ClassSession, baseUrl: string): string {
  const dateStr = new Date(session.session_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
  return `⚠️ ENG SPARK — แจ้งการขาดเรียน
━━━━━━━━━━━━━━━━━
น้อง${student.nickname} (${student.grade}) ไม่ได้เข้าเรียนครับ

📅 วัน: ${dateStr}
📖 หัวข้อ: ${session.topic}
⏱ ระยะเวลา: ${session.duration_hours} ชั่วโมง

🔁 ต้องนัด Make-up Class ${session.duration_hours} ชม. ในหัวข้อนี้
ติดต่อครูเพื่อนัดวันเรียนชดเชยได้เลยครับ

ดูพัฒนาการน้องได้ที่:
${baseUrl}/parent/${student.parent_token}

— ครูภาษาอังกฤษ ENG SPARK`;
}

export function buildLeaveMessage(student: Student, session: ClassSession, baseUrl: string): string {
  const dateStr = new Date(session.session_date).toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });
  return `📋 ENG SPARK — แจ้งการลาเรียน
━━━━━━━━━━━━━━━━━
น้อง${student.nickname} (${student.grade}) ลาเรียนครับ

📅 วัน: ${dateStr}
📖 หัวข้อ: ${session.topic}
⏱ ระยะเวลา: ${session.duration_hours} ชั่วโมง

🔁 ต้องนัด Make-up Class ${session.duration_hours} ชม. ในหัวข้อนี้
ติดต่อครูเพื่อนัดวันเรียนชดเชยได้เลยครับ

ดูพัฒนาการน้องได้ที่:
${baseUrl}/parent/${student.parent_token}

— ครูภาษาอังกฤษ ENG SPARK`;
}

export function buildMakeupCompleteMessage(student: Student, topic: string, baseUrl: string): string {
  return `✅ ENG SPARK — เรียน Make-up เสร็จแล้ว
━━━━━━━━━━━━━━━━━
น้อง${student.nickname} (${student.grade}) ได้เรียน Make-up Class เสร็จแล้วครับ

📖 หัวข้อ: ${topic}
📅 วันที่เรียนชดเชย: ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long' })}

ดูพัฒนาการน้องได้ที่:
${baseUrl}/parent/${student.parent_token}

— ครูภาษาอังกฤษ ENG SPARK`;
}
