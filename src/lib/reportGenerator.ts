import type { Submission } from './supabase';
import type { GroupData, Skill } from './testData';

export interface SkillResult {
  skill: Skill;
  correct: number;
  total: number;
  percentage: number;
  isStrong: boolean;
}

export function computeSkillResults(submission: Submission, groupData: GroupData): SkillResult[] {
  return groupData.skills.map((skill) => {
    const correct = skill.questions.filter(
      (qNum) => submission.answers[String(qNum)] === groupData.answerKey[qNum]
    ).length;
    const total = skill.questions.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { skill, correct, total, percentage, isStrong: percentage >= 70 };
  });
}

export function generateVerbalScript(submission: Submission, groupData: GroupData): string {
  const skillResults = computeSkillResults(submission, groupData);
  const strong = skillResults.filter((r) => r.isStrong);
  const weak = skillResults.filter((r) => !r.isStrong);

  const strongNames = strong.map((r) => r.skill.thaiLabel).join(', ');
  const weakNames = weak.map((r) => r.skill.thaiLabel).join(', ');

  let lines = [
    `📊 สรุปผลน้อง${submission.nickname} — สคริปต์พูดกับผู้ปกครอง`,
    `━━━━━━━━━━━━━━━━━`,
    `คะแนน: ${submission.score}/${submission.total} → ระดับ ${submission.level}`,
    ``,
  ];

  if (strong.length > 0) {
    lines.push(`✅ จุดเด่น: ${strongNames}`);
  } else {
    lines.push(`✅ จุดเด่น: กำลังพัฒนาทุกด้าน — ไปได้ดีมากครับ`);
  }

  if (weak.length > 0) {
    lines.push(`📈 พัฒนาต่อ: ${weakNames}`);
  }

  lines.push(``);
  lines.push(`ประโยคแนะนำ:`);

  if (strong.length > 0 && weak.length > 0) {
    lines.push(`"น้อง${submission.nickname}ทำได้ดีมากเรื่อง ${strongNames} ครับ ส่วนที่เราจะโฟกัสด้วยกันในชั้นเรียนคือ ${weakNames} — ผมมั่นใจว่าพัฒนาได้เร็วมากครับ"`);
  } else if (strong.length > 0 && weak.length === 0) {
    lines.push(`น้อง${submission.nickname}ทำได้ยอดเยี่ยมมากครับ ทุกด้านอยู่ในระดับดี เราจะต่อยอดไปสู่ทักษะขั้นสูงได้เลยครับ`);
  } else {
    lines.push(`"น้อง${submission.nickname}กำลังพัฒนาทุกด้าน — ไปได้ดีมากครับ ผมมั่นใจว่าพัฒนาได้เร็วมากครับ"`);
  }

  return lines.join('\n');
}

export function generateLineReport(submission: Submission, groupData: GroupData): string {
  const skillResults = computeSkillResults(submission, groupData);
  const strong = skillResults.filter((r) => r.isStrong);
  const weak = skillResults.filter((r) => !r.isStrong);
  const percent = Math.round((submission.score / submission.total) * 100);
  const nameDisplay = submission.full_name
    ? `น้อง${submission.nickname} (${submission.full_name})`
    : `น้อง${submission.nickname}`;
  const date = new Date(submission.session_date).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [
    `📋 ผลทดสอบวัดระดับภาษาอังกฤษ (รายละเอียด)`,
    `${nameDisplay} · ${submission.grade} · ${date}`,
    `━━━━━━━━━━━━━━━━━`,
    `🏅 ระดับ: ${submission.level}`,
    `📊 คะแนนรวม: ${submission.score}/${submission.total} คะแนน (${percent}%)`,
    ``,
    `📌 ผลรายทักษะ:`,
  ];

  for (const r of skillResults) {
    const tag = r.isStrong ? '✅' : '📈';
    lines.push(`• ${r.skill.thaiLabel} (${r.skill.englishLabel}): ${r.correct}/${r.total} (${r.percentage}%) ${tag}`);
  }

  lines.push(``);
  lines.push(`✨ จุดแข็งของน้อง:`);
  if (strong.length > 0) {
    for (const r of strong) {
      lines.push(`• ${r.skill.thaiLabel}: ${groupData.skillFeedback[r.skill.key].strong}`);
    }
  } else {
    lines.push(`• กำลังพัฒนาทุกด้าน — ไปได้ดีมากครับ`);
  }

  lines.push(``);
  lines.push(`📈 ทักษะที่จะพัฒนาในชั้นเรียน:`);
  if (weak.length > 0) {
    for (const r of weak) {
      lines.push(`• ${r.skill.thaiLabel}: ${groupData.skillFeedback[r.skill.key].weakTip}`);
    }
  } else {
    lines.push(`• ทุกด้านอยู่ในระดับดีครับ ไม่มีจุดอ่อนที่น่าเป็นห่วง`);
  }

  lines.push(``);
  lines.push(`👨‍🏫 แผนการสอน:`);
  if (weak.length > 0) {
    const weakEnglish = weak.map((r) => r.skill.englishLabel).join(', ');
    lines.push(`ในชั้นเรียน ผมจะเน้น ${weakEnglish} เป็นพิเศษสำหรับน้อง${submission.nickname} เพื่อให้ก้าวหน้าได้อย่างมีทิศทางครับ`);
  } else {
    lines.push(`ผมจะต่อยอดทักษะของน้อง${submission.nickname}ไปสู่ระดับที่สูงขึ้นครับ`);
  }

  lines.push(``);
  lines.push(`🎯 สิ่งที่แนะนำให้ฝึกที่บ้าน:`);
  if (weak.length > 0) {
    for (const r of weak) {
      lines.push(`• ${groupData.skillFeedback[r.skill.key].weakTip}`);
    }
  } else {
    lines.push(`• รักษาระดับที่ดีไว้และเพิ่มการอ่าน English texts ให้หลากหลายขึ้นครับ`);
  }

  lines.push(``);
  lines.push(`ขอบคุณที่ให้ความไว้วางใจนะครับ 🙏`);
  lines.push(`ยินดีต้อนรับน้อง${submission.nickname}สู่ชั้นเรียนภาษาอังกฤษครับ!`);
  lines.push(`— ครูภาษาอังกฤษ`);

  return lines.join('\n');
}
