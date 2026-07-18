// Grammar quiz question bank — 3 sets × 20 questions, tagged per question
// with sentence type + subskill for weakness analysis.

export type QuizKey = 'present_simple' | 'present_continuous' | 'past_simple';
export type SentenceType = 'affirmative' | 'negative' | 'question';
export type OptionKey = 'A' | 'B' | 'C' | 'D';

export interface QuizQuestion {
  number: number;
  text: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
  sentenceType: SentenceType;
  subskill: string;
}

export interface Subskill {
  key: string;
  thaiLabel: string;
  englishLabel: string;
  weakTip: string;
}

export interface QuizSet {
  key: QuizKey;
  thaiLabel: string;
  emoji: string;
  totalQuestions: number;
  bankVersion: number;
  subskills: Subskill[];
  questions: QuizQuestion[];
}

export const SENTENCE_TYPE_LABELS: Record<SentenceType, string> = {
  affirmative: 'ประโยคบอกเล่า',
  negative: 'ประโยคปฏิเสธ',
  question: 'ประโยคคำถาม',
};

// ─── Present Simple ──────────────────────────────────────────────────────────

const PRESENT_SIMPLE: QuizSet = {
  key: 'present_simple',
  thaiLabel: 'Present Simple',
  emoji: '☀️',
  totalQuestions: 20,
  bankVersion: 1,
  subskills: [
    { key: 'ps_third_person_s', thaiLabel: 'การเติม s/es กับประธานเอกพจน์', englishLabel: 'Third-person -s/-es', weakTip: 'ประธานเอกพจน์ (He, She, It, ชื่อคนเดียว) กริยาต้องเติม s หรือ es เช่น She plays / He watches' },
    { key: 'ps_verb_to_be', thaiLabel: 'การใช้ is/am/are', englishLabel: 'Verb to be (is/am/are)', weakTip: 'I ใช้ am, ประธานเอกพจน์ (He/She/It) ใช้ is, ประธานพหูพจน์ (You/We/They) ใช้ are' },
    { key: 'ps_do_does_negative', thaiLabel: 'ประโยคปฏิเสธ don\'t/doesn\'t', englishLabel: 'Negative with don\'t/doesn\'t', weakTip: 'ประธานเอกพจน์ใช้ doesn\'t + กริยาช่อง 1 ไม่เติม s เช่น She doesn\'t like (ไม่ใช่ doesn\'t likes)' },
    { key: 'ps_do_does_question', thaiLabel: 'ประโยคคำถาม Do/Does', englishLabel: 'Do/Does questions', weakTip: 'คำถามใช้ Do/Does + ประธาน + กริยาช่อง 1 เช่น Does he play...? (กริยาไม่เติม s)' },
    { key: 'ps_wh_question', thaiLabel: 'คำถาม Wh- และการเรียงคำ', englishLabel: 'Wh-question word order', weakTip: 'เรียงคำแบบ Wh-word + do/does + ประธาน + กริยา เช่น Where does she live?' },
    { key: 'ps_usage_signal', thaiLabel: 'คำบอกเวลาและการใช้', englishLabel: 'Time signals & usage', weakTip: 'Present Simple ใช้กับสิ่งที่ทำเป็นประจำ สังเกตคำว่า every day, always, usually, often, sometimes, never' },
  ],
  questions: [
    { number: 1, text: 'She ___ to school every day.', options: { A: 'go', B: 'goes', C: 'going', D: 'gone' }, answer: 'B', sentenceType: 'affirmative', subskill: 'ps_third_person_s' },
    { number: 2, text: 'My brother ___ TV in the evening.', options: { A: 'watch', B: 'watchs', C: 'watches', D: 'watching' }, answer: 'C', sentenceType: 'affirmative', subskill: 'ps_third_person_s' },
    { number: 3, text: 'They ___ football after school.', options: { A: 'plays', B: 'play', C: 'playing', D: 'is play' }, answer: 'B', sentenceType: 'affirmative', subskill: 'ps_third_person_s' },
    { number: 4, text: 'The cat ___ milk every morning.', options: { A: 'drink', B: 'drinking', C: 'drinks', D: 'is drink' }, answer: 'C', sentenceType: 'affirmative', subskill: 'ps_third_person_s' },
    { number: 5, text: 'I ___ a student.', options: { A: 'is', B: 'am', C: 'are', D: 'be' }, answer: 'B', sentenceType: 'affirmative', subskill: 'ps_verb_to_be' },
    { number: 6, text: 'They ___ their grandparents every weekend.', options: { A: 'visit', B: 'visits', C: 'are visiting', D: 'visited' }, answer: 'A', sentenceType: 'affirmative', subskill: 'ps_usage_signal' },
    { number: 7, text: 'He ___ coffee every morning.', options: { A: 'is drinking', B: 'drank', C: 'drinks', D: 'drink' }, answer: 'C', sentenceType: 'affirmative', subskill: 'ps_usage_signal' },
    { number: 8, text: 'He ___ like vegetables.', options: { A: 'don\'t', B: 'doesn\'t', C: 'isn\'t', D: 'not' }, answer: 'B', sentenceType: 'negative', subskill: 'ps_do_does_negative' },
    { number: 9, text: 'We ___ go to school on Sunday.', options: { A: 'doesn\'t', B: 'aren\'t', C: 'don\'t', D: 'isn\'t' }, answer: 'C', sentenceType: 'negative', subskill: 'ps_do_does_negative' },
    { number: 10, text: 'She doesn\'t ___ coffee.', options: { A: 'drinks', B: 'drink', C: 'drinking', D: 'drank' }, answer: 'B', sentenceType: 'negative', subskill: 'ps_do_does_negative' },
    { number: 11, text: 'My dog ___ eat fish.', options: { A: 'don\'t', B: 'isn\'t', C: 'aren\'t', D: 'doesn\'t' }, answer: 'D', sentenceType: 'negative', subskill: 'ps_do_does_negative' },
    { number: 12, text: 'I am ___ hungry now.', options: { A: 'don\'t', B: 'not', C: 'doesn\'t', D: 'no' }, answer: 'B', sentenceType: 'negative', subskill: 'ps_verb_to_be' },
    { number: 13, text: '___ you like ice cream?', options: { A: 'Does', B: 'Is', C: 'Do', D: 'Are' }, answer: 'C', sentenceType: 'question', subskill: 'ps_do_does_question' },
    { number: 14, text: '___ she play the piano?', options: { A: 'Do', B: 'Does', C: 'Is', D: 'Are' }, answer: 'B', sentenceType: 'question', subskill: 'ps_do_does_question' },
    { number: 15, text: 'Does he ___ English every day?', options: { A: 'studies', B: 'studying', C: 'study', D: 'studied' }, answer: 'C', sentenceType: 'question', subskill: 'ps_do_does_question' },
    { number: 16, text: '___ your friends kind?', options: { A: 'Is', B: 'Do', C: 'Does', D: 'Are' }, answer: 'D', sentenceType: 'question', subskill: 'ps_verb_to_be' },
    { number: 17, text: 'Where ___ she live?', options: { A: 'do', B: 'does', C: 'is', D: 'are' }, answer: 'B', sentenceType: 'question', subskill: 'ps_wh_question' },
    { number: 18, text: 'What time ___ you wake up?', options: { A: 'does', B: 'is', C: 'do', D: 'are' }, answer: 'C', sentenceType: 'question', subskill: 'ps_wh_question' },
    { number: 19, text: 'เลือกประโยคที่ถูกต้อง', options: { A: 'Where he does work?', B: 'Where does he work?', C: 'Where does he works?', D: 'Where do he work?' }, answer: 'B', sentenceType: 'question', subskill: 'ps_wh_question' },
    { number: 20, text: 'She ___ shopping every weekend.', options: { A: 'is going', B: 'went', C: 'go', D: 'goes' }, answer: 'D', sentenceType: 'affirmative', subskill: 'ps_usage_signal' },
  ],
};

// ─── Present Continuous ──────────────────────────────────────────────────────

const PRESENT_CONTINUOUS: QuizSet = {
  key: 'present_continuous',
  thaiLabel: 'Present Continuous',
  emoji: '🏃',
  totalQuestions: 20,
  bankVersion: 1,
  subskills: [
    { key: 'pc_verb_ing', thaiLabel: 'การเติม -ing', englishLabel: 'V-ing spelling', weakTip: 'กริยาลงท้าย e ตัด e เติม ing (write → writing), พยัญชนะเดี่ยวท้ายคำสั้น ซ้ำตัวสะกด (run → running, swim → swimming)' },
    { key: 'pc_be_choice', thaiLabel: 'การเลือก is/am/are คู่กับ V-ing', englishLabel: 'is/am/are + V-ing agreement', weakTip: 'Present Continuous = is/am/are + V-ing เสมอ เลือก be ตามประธาน: I am, He/She/It is, You/We/They are' },
    { key: 'pc_negative', thaiLabel: 'ประโยคปฏิเสธ', englishLabel: 'Negative (isn\'t/aren\'t/am not + V-ing)', weakTip: 'ปฏิเสธเติม not หลัง be เช่น She is not (isn\'t) sleeping — ไม่ใช้ don\'t/doesn\'t กับ V-ing' },
    { key: 'pc_question', thaiLabel: 'ประโยคคำถาม', englishLabel: 'Be-fronted questions', weakTip: 'คำถามย้าย be ไปหน้าประธาน เช่น Is she cooking? / What are you doing?' },
    { key: 'pc_usage_signal', thaiLabel: 'คำบอกเวลาและเทียบกับ Present Simple', englishLabel: 'Usage & contrast with Present Simple', weakTip: 'Present Continuous ใช้กับสิ่งที่กำลังเกิดตอนนี้ สังเกต now, right now, at the moment, Look!, Listen!' },
  ],
  questions: [
    { number: 1, text: 'She is ___ a book now.', options: { A: 'read', B: 'reads', C: 'reading', D: 'readding' }, answer: 'C', sentenceType: 'affirmative', subskill: 'pc_verb_ing' },
    { number: 2, text: 'The boys are ___ in the pool.', options: { A: 'swiming', B: 'swimming', C: 'swim', D: 'swims' }, answer: 'B', sentenceType: 'affirmative', subskill: 'pc_verb_ing' },
    { number: 3, text: 'He is ___ a letter to his friend.', options: { A: 'writeing', B: 'writting', C: 'writes', D: 'writing' }, answer: 'D', sentenceType: 'affirmative', subskill: 'pc_verb_ing' },
    { number: 4, text: 'Look! The dog is ___ very fast.', options: { A: 'running', B: 'runing', C: 'run', D: 'runs' }, answer: 'A', sentenceType: 'affirmative', subskill: 'pc_verb_ing' },
    { number: 5, text: 'I ___ watching TV right now.', options: { A: 'is', B: 'am', C: 'are', D: 'be' }, answer: 'B', sentenceType: 'affirmative', subskill: 'pc_be_choice' },
    { number: 6, text: 'They ___ playing football at the moment.', options: { A: 'is', B: 'am', C: 'are', D: 'be' }, answer: 'C', sentenceType: 'affirmative', subskill: 'pc_be_choice' },
    { number: 7, text: 'My mother ___ cooking dinner now.', options: { A: 'is', B: 'am', C: 'are', D: 'do' }, answer: 'A', sentenceType: 'affirmative', subskill: 'pc_be_choice' },
    { number: 8, text: 'She ___ sleeping now.', options: { A: 'don\'t', B: 'isn\'t', C: 'doesn\'t', D: 'aren\'t' }, answer: 'B', sentenceType: 'negative', subskill: 'pc_negative' },
    { number: 9, text: 'We ___ not studying English now.', options: { A: 'is', B: 'do', C: 'am', D: 'are' }, answer: 'D', sentenceType: 'negative', subskill: 'pc_negative' },
    { number: 10, text: 'เลือกประโยคที่ถูกต้อง', options: { A: 'He doesn\'t playing games.', B: 'He isn\'t plays games.', C: 'He isn\'t playing games.', D: 'He not playing games.' }, answer: 'C', sentenceType: 'negative', subskill: 'pc_negative' },
    { number: 11, text: 'I am ___ listening to music.', options: { A: 'not', B: 'don\'t', C: 'no', D: 'doesn\'t' }, answer: 'A', sentenceType: 'negative', subskill: 'pc_negative' },
    { number: 12, text: 'The students ___ making noise right now.', options: { A: 'isn\'t', B: 'aren\'t', C: 'don\'t', D: 'doesn\'t' }, answer: 'B', sentenceType: 'negative', subskill: 'pc_negative' },
    { number: 13, text: '___ she cooking in the kitchen?', options: { A: 'Do', B: 'Does', C: 'Is', D: 'Are' }, answer: 'C', sentenceType: 'question', subskill: 'pc_question' },
    { number: 14, text: '___ they waiting for the bus?', options: { A: 'Is', B: 'Are', C: 'Do', D: 'Does' }, answer: 'B', sentenceType: 'question', subskill: 'pc_question' },
    { number: 15, text: 'What ___ you doing now?', options: { A: 'is', B: 'do', C: 'am', D: 'are' }, answer: 'D', sentenceType: 'question', subskill: 'pc_question' },
    { number: 16, text: '___ the baby crying?', options: { A: 'Is', B: 'Are', C: 'Do', D: 'Am' }, answer: 'A', sentenceType: 'question', subskill: 'pc_question' },
    { number: 17, text: 'เลือกประโยคที่ถูกต้อง', options: { A: 'Where you are going?', B: 'Where are you going?', C: 'Where do you going?', D: 'Where are you go?' }, answer: 'B', sentenceType: 'question', subskill: 'pc_question' },
    { number: 18, text: 'Listen! Someone ___ at the door.', options: { A: 'knocks', B: 'knock', C: 'is knocking', D: 'knocking' }, answer: 'C', sentenceType: 'affirmative', subskill: 'pc_usage_signal' },
    { number: 19, text: 'I usually walk to school, but today I ___ the bus.', options: { A: 'take', B: 'takes', C: 'am taking', D: 'taking' }, answer: 'C', sentenceType: 'affirmative', subskill: 'pc_usage_signal' },
    { number: 20, text: 'She ___ TV every day, but she ___ now.', options: { A: 'watches / isn\'t watching', B: 'is watching / doesn\'t watch', C: 'watch / not watching', D: 'watches / doesn\'t watching' }, answer: 'A', sentenceType: 'affirmative', subskill: 'pc_usage_signal' },
  ],
};

// ─── Past Simple ─────────────────────────────────────────────────────────────

const PAST_SIMPLE: QuizSet = {
  key: 'past_simple',
  thaiLabel: 'Past Simple',
  emoji: '⏪',
  totalQuestions: 20,
  bankVersion: 1,
  subskills: [
    { key: 'pt_regular_ed', thaiLabel: 'กริยาปกติเติม -ed', englishLabel: 'Regular -ed forms', weakTip: 'กริยาปกติเติม ed (play → played), ลงท้าย e เติมแค่ d (live → lived), ลงท้าย y หลังพยัญชนะเปลี่ยนเป็น ied (study → studied)' },
    { key: 'pt_irregular', thaiLabel: 'กริยาอปกติ', englishLabel: 'Irregular verbs', weakTip: 'กริยาอปกติต้องท่องจำช่อง 2 เช่น go → went, eat → ate, see → saw, buy → bought, have → had' },
    { key: 'pt_was_were', thaiLabel: 'การใช้ was/were', englishLabel: 'was/were', weakTip: 'อดีตของ be: I/He/She/It ใช้ was, You/We/They ใช้ were' },
    { key: 'pt_did_negative', thaiLabel: 'ประโยคปฏิเสธ didn\'t', englishLabel: 'Negative with didn\'t', weakTip: 'ปฏิเสธในอดีตใช้ didn\'t + กริยาช่อง 1 เสมอ เช่น She didn\'t go (ไม่ใช่ didn\'t went)' },
    { key: 'pt_did_question', thaiLabel: 'ประโยคคำถาม Did', englishLabel: 'Did questions', weakTip: 'คำถามในอดีตใช้ Did + ประธาน + กริยาช่อง 1 เช่น Did you see...? (กริยากลับเป็นช่อง 1)' },
    { key: 'pt_usage_signal', thaiLabel: 'คำบอกเวลา', englishLabel: 'Time signals', weakTip: 'Past Simple ใช้กับเรื่องที่จบไปแล้ว สังเกต yesterday, last week/month/year, ago, in 2020' },
  ],
  questions: [
    { number: 1, text: 'I ___ football with my friends yesterday.', options: { A: 'play', B: 'played', C: 'plays', D: 'playing' }, answer: 'B', sentenceType: 'affirmative', subskill: 'pt_regular_ed' },
    { number: 2, text: 'She ___ English very hard last night.', options: { A: 'studyed', B: 'studys', C: 'studied', D: 'study' }, answer: 'C', sentenceType: 'affirmative', subskill: 'pt_regular_ed' },
    { number: 3, text: 'They ___ in Bangkok two years ago.', options: { A: 'lived', B: 'liveed', C: 'live', D: 'living' }, answer: 'A', sentenceType: 'affirmative', subskill: 'pt_regular_ed' },
    { number: 4, text: 'We ___ to the zoo last Sunday.', options: { A: 'go', B: 'goed', C: 'gone', D: 'went' }, answer: 'D', sentenceType: 'affirmative', subskill: 'pt_irregular' },
    { number: 5, text: 'He ___ rice for breakfast this morning.', options: { A: 'eated', B: 'ate', C: 'eat', D: 'eaten' }, answer: 'B', sentenceType: 'affirmative', subskill: 'pt_irregular' },
    { number: 6, text: 'I ___ a beautiful bird in the garden yesterday.', options: { A: 'saw', B: 'seed', C: 'see', D: 'seen' }, answer: 'A', sentenceType: 'affirmative', subskill: 'pt_irregular' },
    { number: 7, text: 'She ___ in Chiang Mai three years ago.', options: { A: 'lives', B: 'lived', C: 'is living', D: 'live' }, answer: 'B', sentenceType: 'affirmative', subskill: 'pt_usage_signal' },
    { number: 8, text: 'I ___ very tired last night.', options: { A: 'were', B: 'am', C: 'is', D: 'was' }, answer: 'D', sentenceType: 'affirmative', subskill: 'pt_was_were' },
    { number: 9, text: 'My friends ___ football last Saturday.', options: { A: 'played', B: 'play', C: 'are playing', D: 'plays' }, answer: 'A', sentenceType: 'affirmative', subskill: 'pt_usage_signal' },
    { number: 10, text: 'She ___ go to school yesterday because she was sick.', options: { A: 'don\'t', B: 'doesn\'t', C: 'didn\'t', D: 'wasn\'t' }, answer: 'C', sentenceType: 'negative', subskill: 'pt_did_negative' },
    { number: 11, text: 'We didn\'t ___ TV last night.', options: { A: 'watched', B: 'watch', C: 'watches', D: 'watching' }, answer: 'B', sentenceType: 'negative', subskill: 'pt_did_negative' },
    { number: 12, text: 'เลือกประโยคที่ถูกต้อง', options: { A: 'He didn\'t went to work.', B: 'He didn\'t goes to work.', C: 'He don\'t went to work.', D: 'He didn\'t go to work.' }, answer: 'D', sentenceType: 'negative', subskill: 'pt_did_negative' },
    { number: 13, text: 'I ___ eat breakfast this morning.', options: { A: 'didn\'t', B: 'don\'t', C: 'wasn\'t', D: 'am not' }, answer: 'A', sentenceType: 'negative', subskill: 'pt_did_negative' },
    { number: 14, text: 'The food ___ delicious.', options: { A: 'weren\'t', B: 'wasn\'t', C: 'didn\'t', D: 'isn\'t was' }, answer: 'B', sentenceType: 'negative', subskill: 'pt_was_were' },
    { number: 15, text: '___ you go to the party last night?', options: { A: 'Do', B: 'Does', C: 'Did', D: 'Were' }, answer: 'C', sentenceType: 'question', subskill: 'pt_did_question' },
    { number: 16, text: 'Did she ___ the homework?', options: { A: 'finished', B: 'finish', C: 'finishes', D: 'finishing' }, answer: 'B', sentenceType: 'question', subskill: 'pt_did_question' },
    { number: 17, text: 'เลือกประโยคที่ถูกต้อง', options: { A: 'Did you saw the movie?', B: 'Do you saw the movie?', C: 'Did you watched the movie?', D: 'Did you see the movie?' }, answer: 'D', sentenceType: 'question', subskill: 'pt_did_question' },
    { number: 18, text: '___ they at home yesterday?', options: { A: 'Were', B: 'Was', C: 'Did', D: 'Are' }, answer: 'A', sentenceType: 'question', subskill: 'pt_was_were' },
    { number: 19, text: 'Where ___ you go last summer?', options: { A: 'do', B: 'did', C: 'were', D: 'does' }, answer: 'B', sentenceType: 'question', subskill: 'pt_did_question' },
    { number: 20, text: 'I visited my grandmother ___.', options: { A: 'tomorrow', B: 'now', C: 'last month', D: 'every day' }, answer: 'C', sentenceType: 'affirmative', subskill: 'pt_usage_signal' },
  ],
};

export const QUIZ_SETS: Record<QuizKey, QuizSet> = {
  present_simple: PRESENT_SIMPLE,
  present_continuous: PRESENT_CONTINUOUS,
  past_simple: PAST_SIMPLE,
};

export const QUIZ_KEYS: QuizKey[] = ['present_simple', 'present_continuous', 'past_simple'];

export function isQuizKey(key: string): key is QuizKey {
  return key in QUIZ_SETS;
}

// ─── Grading + weakness analysis ─────────────────────────────────────────────

export interface TallyEntry { wrong: number; total: number; }

export interface AttemptAnalysis {
  bySentenceType: Record<SentenceType, TallyEntry>;
  bySubskill: Record<string, TallyEntry>;
  weakSubskills: string[];
}

export function gradeAttempt(quizKey: QuizKey, answers: Record<string, string>): {
  score: number;
  wrongQuestions: number[];
  analysis: AttemptAnalysis;
} {
  const set = QUIZ_SETS[quizKey];
  const bySentenceType: Record<SentenceType, TallyEntry> = {
    affirmative: { wrong: 0, total: 0 },
    negative: { wrong: 0, total: 0 },
    question: { wrong: 0, total: 0 },
  };
  const bySubskill: Record<string, TallyEntry> = {};
  set.subskills.forEach(s => { bySubskill[s.key] = { wrong: 0, total: 0 }; });

  const wrongQuestions: number[] = [];
  let score = 0;

  for (const q of set.questions) {
    bySentenceType[q.sentenceType].total += 1;
    bySubskill[q.subskill].total += 1;
    if (answers[String(q.number)] === q.answer) {
      score += 1;
    } else {
      wrongQuestions.push(q.number);
      bySentenceType[q.sentenceType].wrong += 1;
      bySubskill[q.subskill].wrong += 1;
    }
  }

  // Weak: >=2 wrong OR >=50% wrong within the subskill; sorted worst-first
  const weakSubskills = Object.entries(bySubskill)
    .filter(([, t]) => t.total > 0 && (t.wrong >= 2 || t.wrong / t.total >= 0.5))
    .sort(([, a], [, b]) => (b.wrong / b.total) - (a.wrong / a.total))
    .map(([key]) => key);

  return { score, wrongQuestions, analysis: { bySentenceType, bySubskill, weakSubskills } };
}

export function subskillLabel(quizKey: QuizKey, subskillKey: string): Subskill | undefined {
  return QUIZ_SETS[quizKey]?.subskills.find(s => s.key === subskillKey);
}
