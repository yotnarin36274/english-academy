export type GroupKey = 'p46' | 'm13' | 'm46';

export interface Question {
  number: number;
  text: string;
  passage?: string;
  options: { A: string; B: string; C: string; D: string };
}

export interface Skill {
  key: string;
  thaiLabel: string;
  englishLabel: string;
  questions: number[];
}

export interface SkillFeedback {
  strong: string;
  weakTip: string;
}

export interface LevelCutoff {
  min: number;
  max: number;
  name: string;
}

export interface GroupData {
  key: GroupKey;
  label: string;
  grades: string[];
  totalQuestions: number;
  timeMinutes: number;
  questions: Question[];
  answerKey: Record<number, string>;
  skills: Skill[];
  levelCutoffs: LevelCutoff[];
  skillFeedback: Record<string, SkillFeedback>;
}

const TOM_PASSAGE = `Tom is a student at Sunflower Primary School. He loves playing football with his friends after school every day. Every morning, he wakes up at six o'clock and eats breakfast with his family before going to school. His favourite subject is English because he thinks it is fun and very useful. On weekends, Tom usually helps his mother in the garden and reads comic books in the afternoon.`;

const THAILAND_PASSAGE = `Thailand is known around the world for its beautiful temples, delicious street food, and warm, friendly people. Each year, millions of tourists visit the country to experience its rich and unique culture. Bangkok, the capital city, is famous for its modern shopping malls, vibrant night markets, and impressive royal palaces. However, many visitors also travel north to Chiang Mai, where ancient temples sit quietly among mountains and the cooler weather provides a welcome contrast to the tropical south. In recent years, Thailand has also become popular for medical tourism, as many foreigners travel there for high-quality but affordable healthcare. Whether you prefer the excitement of city life or the peace of nature, Thailand offers something wonderful for every type of traveller.`;

const AI_PASSAGE = `Artificial intelligence is rapidly transforming the way humans work, communicate, and make decisions. Unlike previous technological revolutions, which primarily replaced physical labour, AI has the potential to automate complex cognitive tasks once considered exclusively human — from diagnosing diseases to composing music. Proponents argue that AI will ultimately create more jobs than it displaces, pointing to historical precedents where new technology generated entirely new industries. Critics, however, warn that the pace of AI development may outstrip society's ability to adapt, potentially leaving millions of workers without transferable skills. The challenge for policymakers lies in balancing innovation with social protection — ensuring that the economic benefits of AI are distributed broadly, rather than concentrated in the hands of a relatively small number of technology companies.`;

export const GROUPS: Record<GroupKey, GroupData> = {
  p46: {
    key: 'p46',
    label: 'ป.4–ป.6',
    grades: ['ป.4', 'ป.5', 'ป.6'],
    totalQuestions: 20,
    timeMinutes: 12,
    answerKey: {
      1: 'B', 2: 'C', 3: 'C', 4: 'D', 5: 'B',
      6: 'B', 7: 'B', 8: 'D', 9: 'C', 10: 'C',
      11: 'C', 12: 'A', 13: 'B', 14: 'B', 15: 'D',
      16: 'D', 17: 'B', 18: 'B', 19: 'C', 20: 'C',
    },
    levelCutoffs: [
      { min: 0, max: 6, name: 'Starter' },
      { min: 7, max: 12, name: 'Elementary' },
      { min: 13, max: 16, name: 'Pre-Intermediate' },
      { min: 17, max: 20, name: 'Advanced' },
    ],
    skills: [
      { key: 'vocab', thaiLabel: 'คำศัพท์พื้นฐาน', englishLabel: 'Basic Vocabulary', questions: [1, 2, 3, 4, 5, 6] },
      { key: 'tenses', thaiLabel: 'กาลและรูปกริยา', englishLabel: 'Verb Tenses', questions: [7, 8, 9] },
      { key: 'grammar', thaiLabel: 'โครงสร้างไวยากรณ์', englishLabel: 'Grammar Structures', questions: [10, 11, 12, 13, 14, 15, 16] },
      { key: 'reading', thaiLabel: 'การอ่านจับใจความ', englishLabel: 'Reading Comprehension', questions: [17, 18, 19, 20] },
    ],
    skillFeedback: {
      vocab: {
        strong: 'คำศัพท์พื้นฐานดีมาก รู้จักคำในชีวิตประจำวันครอบคลุม ทั้งสี ทิศ สถานที่ และอารมณ์',
        weakTip: 'ฝึกท่อง vocabulary จากหัวข้อในชีวิตประจำวัน เช่น สี ทิศ อาหาร อารมณ์ อย่างน้อยวันละ 5–10 คำครับ',
      },
      tenses: {
        strong: 'เข้าใจกาลหลักได้ดี ใช้ Present, Past และ Present Continuous ได้ถูกต้อง',
        weakTip: 'ทบทวน Present Simple, Past Simple และ Present Continuous — เน้นการใช้งานในประโยคสั้นๆ ในชีวิตจริงก่อนครับ',
      },
      grammar: {
        strong: 'โครงสร้างไวยากรณ์แน่นดี ครอบคลุมทั้ง modal verbs, conditional และ passive voice',
        weakTip: 'ฝึกโครงสร้าง can/can\'t, there is/are, present perfect และ passive voice ผ่านประโยคสั้นๆ ในชีวิตประจำวันครับ',
      },
      reading: {
        strong: 'จับใจความจากบทอ่านได้ดี ทั้งรายละเอียดและความหมายโดยรวม',
        weakTip: 'ฝึกอ่านข้อความสั้นๆ แล้วตอบคำถาม เน้นการหา detail และ main idea ให้เป็นนิสัยครับ',
      },
    },
    questions: [
      { number: 1, text: 'The sun rises in the _____ every morning.', options: { A: 'North', B: 'East', C: 'South', D: 'West' } },
      { number: 2, text: 'My mother cooks our meals in the _____.', options: { A: 'Bedroom', B: 'Bathroom', C: 'Kitchen', D: 'Garden' } },
      { number: 3, text: 'Put on your _____ — it is cold outside today.', options: { A: 'Cap', B: 'Sandals', C: 'Jacket', D: 'Dress' } },
      { number: 4, text: 'She was very _____ when she lost her favourite book.', options: { A: 'Happy', B: 'Excited', C: 'Proud', D: 'Upset' } },
      { number: 5, text: 'The doctor told him to _____ at least eight glasses of water every day.', options: { A: 'Eat', B: 'Drink', C: 'Touch', D: 'Smell' } },
      { number: 6, text: 'I could not sleep because of the loud _____ coming from next door.', options: { A: 'Light', B: 'Music', C: 'Smell', D: 'Colour' } },
      { number: 7, text: 'She _____ her teeth every morning before breakfast.', options: { A: 'Brush', B: 'Brushes', C: 'Brushed', D: 'Brushing' } },
      { number: 8, text: 'We _____ a film together after dinner last night.', options: { A: 'Watch', B: 'Watches', C: 'Watching', D: 'Watched' } },
      { number: 9, text: 'Look! The dog _____ in the garden right now.', options: { A: 'Sleep', B: 'Slept', C: 'Is sleeping', D: 'Sleeps' } },
      { number: 10, text: '_____ you help me carry these heavy bags, please?', options: { A: 'Do', B: 'Are', C: 'Can', D: 'Have' } },
      { number: 11, text: 'There _____ many students in the classroom today.', options: { A: 'Am', B: 'Is', C: 'Are', D: 'Be' } },
      { number: 12, text: 'He has two _____ — a dog and a cat.', options: { A: 'Pets', B: 'Pet', C: 'Petes', D: 'Petting' } },
      { number: 13, text: 'She has not finished her project _____.', options: { A: 'Already', B: 'Yet', C: 'Still', D: 'Just' } },
      { number: 14, text: 'If I have free time this weekend, I _____ visit you.', options: { A: 'Would', B: 'Will', C: 'Shall', D: 'Should' } },
      { number: 15, text: 'This cake _____ by my mother for my birthday last week.', options: { A: 'Made', B: 'Makes', C: 'Is making', D: 'Was made' } },
      { number: 16, text: 'She is taller _____ her older brother.', options: { A: 'Then', B: 'That', C: 'To', D: 'Than' } },
      { number: 17, text: 'What does Tom love doing after school?', passage: TOM_PASSAGE, options: { A: 'Reading comics', B: 'Playing football', C: 'Sleeping', D: 'Watching TV' } },
      { number: 18, text: 'What time does Tom wake up in the morning?', passage: TOM_PASSAGE, options: { A: 'Five o\'clock', B: 'Six o\'clock', C: 'Seven o\'clock', D: 'Eight o\'clock' } },
      { number: 19, text: 'Why does Tom like English?', passage: TOM_PASSAGE, options: { A: 'It is very easy', B: 'He likes his teacher', C: 'It is fun and useful', D: 'His friends like it' } },
      { number: 20, text: 'What does Tom do on weekends?', passage: TOM_PASSAGE, options: { A: 'Plays football', B: 'Goes shopping', C: 'Helps in the garden and reads', D: 'Studies at school' } },
    ],
  },

  m13: {
    key: 'm13',
    label: 'ม.1–ม.3',
    grades: ['ม.1', 'ม.2', 'ม.3'],
    totalQuestions: 25,
    timeMinutes: 15,
    answerKey: {
      1: 'B', 2: 'C', 3: 'D', 4: 'C', 5: 'A',
      6: 'A', 7: 'C', 8: 'D', 9: 'D', 10: 'D',
      11: 'D', 12: 'D', 13: 'B', 14: 'D', 15: 'C',
      16: 'D', 17: 'C', 18: 'D', 19: 'D', 20: 'C',
      21: 'B', 22: 'B', 23: 'C', 24: 'B', 25: 'C',
    },
    levelCutoffs: [
      { min: 0, max: 8, name: 'Starter' },
      { min: 9, max: 15, name: 'Elementary' },
      { min: 16, max: 21, name: 'Pre-Intermediate' },
      { min: 22, max: 25, name: 'Advanced' },
    ],
    skills: [
      { key: 'vocab', thaiLabel: 'คำศัพท์', englishLabel: 'Vocabulary', questions: [1, 2, 3, 4, 5, 6, 7, 8] },
      { key: 'coretenses', thaiLabel: 'กาลหลัก', englishLabel: 'Core Tenses', questions: [9, 10, 11] },
      { key: 'perfectpassive', thaiLabel: 'Perfect & Passive', englishLabel: 'Perfect & Passive Voice', questions: [12, 14] },
      { key: 'modals', thaiLabel: 'Modals & Conditionals', englishLabel: 'Modals & Conditionals', questions: [13, 15, 16] },
      { key: 'advanced', thaiLabel: 'ไวยากรณ์ขั้นสูง', englishLabel: 'Advanced Grammar', questions: [17, 18, 19, 20] },
      { key: 'reading', thaiLabel: 'การอ่าน', englishLabel: 'Reading Comprehension', questions: [21, 22, 23, 24, 25] },
    ],
    skillFeedback: {
      vocab: {
        strong: 'คำศัพท์ดีมาก ครอบคลุมทั้ง adjectives, verbs และ nouns ระดับกลาง',
        weakTip: 'เพิ่มคำศัพท์ระดับกลาง เช่น adjectives และ verbs ที่ใช้ในชีวิตประจำวัน แนะนำ flashcard หรือ Quizlet ครับ',
      },
      coretenses: {
        strong: 'กาลหลักแน่นมาก ใช้ Present, Past และ Past Continuous ได้ถูกต้อง',
        weakTip: 'ทบทวน Present Simple, Past Simple และ Past Continuous ให้มั่นใจก่อน — เป็นรากฐานของทุกอย่างครับ',
      },
      perfectpassive: {
        strong: 'เข้าใจ Present Perfect และ Passive Voice ได้ดี',
        weakTip: 'ฝึก Present Perfect กับ for/since/already/yet และ Passive voice (was/were + V3) ให้เห็นภาพการใช้งานจริงครับ',
      },
      modals: {
        strong: 'ใช้ Modal Verbs และ Conditionals ได้ดี รู้ความแตกต่างของความหมายชัดเจน',
        weakTip: 'ฝึก If...will... (1st conditional) และ must/mustn\'t/don\'t have to และ wish + could ให้ชัดเจนครับ',
      },
      advanced: {
        strong: 'ไวยากรณ์ขั้นสูงดีมาก ครอบคลุม Past Perfect, Gerunds และ Inversion',
        weakTip: 'Past Perfect, suggest+gerund, make+infinitive และ Inversion (Not only...) — ต้องใช้เวลาฝึกแต่ทำได้แน่นอนครับ',
      },
      reading: {
        strong: 'อ่านจับใจความได้ดี ทั้ง literal detail และ vocabulary in context',
        weakTip: 'ฝึกอ่าน passage สั้นๆ แล้วตอบคำถาม เน้นหา vocabulary in context และ main idea ครับ',
      },
    },
    questions: [
      { number: 1, text: 'She felt very _____ after the long journey from Chiang Mai.', options: { A: 'Excited', B: 'Exhausted', C: 'Bored', D: 'Angry' } },
      { number: 2, text: 'The _____ of the accident was caught on a security camera.', options: { A: 'Activity', B: 'Experience', C: 'Incident', D: 'Occasion' } },
      { number: 3, text: 'He made a _____ decision without thinking carefully about the results.', options: { A: 'Steady', B: 'Gradual', C: 'Careful', D: 'Hasty' } },
      { number: 4, text: 'Please _____ your answer carefully before submitting the test.', options: { A: 'Combine', B: 'Compare', C: 'Consider', D: 'Complete' } },
      { number: 5, text: 'The government plans to _____ a new community park in the city centre.', options: { A: 'Construct', B: 'Produce', C: 'Perform', D: 'Deliver' } },
      { number: 6, text: 'After the heavy storm, the road was completely _____ with fallen trees.', options: { A: 'Blocked', B: 'Covered', C: 'Filled', D: 'Mixed' } },
      { number: 7, text: "The politician's speech was very _____ and convinced many people to support him.", options: { A: 'Creative', B: 'Sensitive', C: 'Persuasive', D: 'Productive' } },
      { number: 8, text: 'Scientists are searching for a _____ to the problem of air pollution in cities.', options: { A: 'Result', B: 'Conclusion', C: 'Decision', D: 'Solution' } },
      { number: 9, text: 'She _____ to school every day by bus, even in the rain.', options: { A: 'Go', B: 'Going', C: 'Gone', D: 'Goes' } },
      { number: 10, text: 'I _____ my homework before dinner last night.', options: { A: 'Do', B: 'Done', C: 'Doing', D: 'Did' } },
      { number: 11, text: 'They _____ basketball when it started to rain heavily.', options: { A: 'Played', B: 'Play', C: 'Are playing', D: 'Were playing' } },
      { number: 12, text: 'She has _____ to Japan twice and wants to go again.', options: { A: 'Go', B: 'Went', C: 'Gone', D: 'Been' } },
      { number: 13, text: 'If it rains tomorrow, we _____ have the picnic inside instead.', options: { A: 'Would', B: 'Will', C: 'Shall', D: 'Should' } },
      { number: 14, text: 'This photograph _____ by my grandfather during the Second World War.', options: { A: 'Took', B: 'Is taking', C: 'Has taken', D: 'Was taken' } },
      { number: 15, text: 'You _____ touch the paintings in the museum — it is strictly forbidden.', options: { A: "Don't have to", B: "Needn't", C: "Mustn't", D: "Wouldn't" } },
      { number: 16, text: 'I wish I _____ speak French as well as she does.', options: { A: 'Can', B: 'Will', C: 'Would', D: 'Could' } },
      { number: 17, text: 'By the time we arrived at the cinema, the film _____.', options: { A: 'Already started', B: 'Has already started', C: 'Had already started', D: 'Was already starting' } },
      { number: 18, text: 'The teacher suggested _____ the whole exercise again for extra practice.', options: { A: 'To do', B: 'Done', C: 'Go', D: 'Doing' } },
      { number: 19, text: 'The teacher made the students _____ the exercise again from the beginning.', options: { A: 'To do', B: 'Doing', C: 'Done', D: 'Do' } },
      { number: 20, text: 'Not only _____ the exam, but she also achieved the highest score in class.', options: { A: 'She passed', B: 'Passed she', C: 'Did she pass', D: 'She did pass' } },
      { number: 21, text: 'What is Thailand known for internationally?', passage: THAILAND_PASSAGE, options: { A: 'Cold weather and mountains', B: 'Temples, food, and friendly people', C: 'Advanced technology', D: 'Large manufacturing factories' } },
      { number: 22, text: 'What is Bangkok famous for, according to the passage?', passage: THAILAND_PASSAGE, options: { A: 'Ancient temples and cool weather', B: 'Shopping malls, night markets, and palaces', C: 'Medical tourism and hospitals', D: 'Mountains and national parks' } },
      { number: 23, text: 'Why do many visitors travel to Chiang Mai?', passage: THAILAND_PASSAGE, options: { A: 'For large shopping malls', B: 'For hot tropical weather', C: 'For ancient temples and cooler weather', D: 'For the best hospitals' } },
      { number: 24, text: 'The phrase "medical tourism" in the passage refers to _____.', passage: THAILAND_PASSAGE, options: { A: 'Visiting hospitals for fun', B: 'Travelling abroad for healthcare', C: 'Tourism companies for doctors', D: 'Medicine from other countries' } },
      { number: 25, text: "What is the writer's main message about Thailand?", passage: THAILAND_PASSAGE, options: { A: 'Bangkok is better than Chiang Mai', B: 'Only nature lovers enjoy Thailand', C: 'Thailand has something for all types of visitors', D: "Medical tourism is Thailand's biggest industry" } },
    ],
  },

  m46: {
    key: 'm46',
    label: 'ม.4–ม.6',
    grades: ['ม.4', 'ม.5', 'ม.6'],
    totalQuestions: 25,
    timeMinutes: 20,
    answerKey: {
      1: 'B', 2: 'C', 3: 'A', 4: 'D', 5: 'C',
      6: 'B', 7: 'C', 8: 'D', 9: 'D', 10: 'D',
      11: 'D', 12: 'C', 13: 'C', 14: 'D', 15: 'C',
      16: 'C', 17: 'D', 18: 'D', 19: 'C', 20: 'C',
      21: 'B', 22: 'C', 23: 'C', 24: 'B', 25: 'C',
    },
    levelCutoffs: [
      { min: 0, max: 9, name: 'Elementary' },
      { min: 10, max: 16, name: 'Pre-Intermediate' },
      { min: 17, max: 21, name: 'Intermediate' },
      { min: 22, max: 25, name: 'Upper-Intermediate' },
    ],
    skills: [
      { key: 'vocab', thaiLabel: 'คำศัพท์วิชาการ', englishLabel: 'Academic Vocabulary', questions: [1, 2, 3, 4, 5, 6, 7, 8] },
      { key: 'perfectadv', thaiLabel: 'กาลขั้นสูง & Conditionals', englishLabel: 'Advanced Tenses', questions: [9, 11] },
      { key: 'inversion', thaiLabel: 'Inversion & Emphasis', englishLabel: 'Inversion & Emphasis', questions: [10, 20] },
      { key: 'subjunctive', thaiLabel: 'Subjunctive & Formal', englishLabel: 'Subjunctive Mood & Formal Structures', questions: [12, 16] },
      { key: 'complex', thaiLabel: 'โครงสร้างซับซ้อน', englishLabel: 'Complex Structures', questions: [13, 14, 15, 17, 18, 19] },
      { key: 'reading', thaiLabel: 'การอ่านเชิงวิเคราะห์', englishLabel: 'Analytical Reading', questions: [21, 22, 23, 24, 25] },
    ],
    skillFeedback: {
      vocab: {
        strong: 'คำศัพท์วิชาการแข็งแกร่งมาก ครอบคลุมทั้ง collocations และ word forms',
        weakTip: 'เพิ่มคำศัพท์ระดับ academic เช่น opposition, composure, revolutionary — แนะนำอ่าน English news ทุกวันครับ',
      },
      perfectadv: {
        strong: 'กาลขั้นสูงและ 3rd Conditional แม่นยำมาก',
        weakTip: 'ฝึก Past Perfect Continuous (had been doing) และ 3rd Conditional (had + would have) — ใช้บ่อยในงานเขียนวิชาการครับ',
      },
      inversion: {
        strong: 'เข้าใจ Inversion ได้ดี ใช้ได้ถูกต้องทั้ง Not only... และ Rarely...',
        weakTip: 'ฝึก inversion หลัง Not only..., Rarely..., Never... — ใช้บ่อยในข้อสอบ GAT และงานเขียนวิชาการครับ',
      },
      subjunctive: {
        strong: 'เข้าใจ Subjunctive Mood ได้ดี ใช้หลัง insist/essential ถูกต้อง',
        weakTip: 'ฝึก subjunctive หลัง insist/suggest/essential/important that + base verb — พบบ่อยใน formal writing ครับ',
      },
      complex: {
        strong: 'โครงสร้างซับซ้อนแน่น ครอบคลุม relative clauses, connectors และ verb patterns',
        weakTip: 'ฝึก despite/although, non-defining relative clauses, the more...the more, would rather+past และ deny+gerund ครับ',
      },
      reading: {
        strong: 'อ่านเชิงวิเคราะห์ได้ดีมาก ทำ inference และ vocabulary in context ได้แม่นยำ',
        weakTip: 'ฝึกอ่าน academic texts และตอบคำถาม inference, main idea และ vocabulary in context ให้คล่องขึ้นครับ',
      },
    },
    questions: [
      { number: 1, text: "The government's new economic policy was met with significant public _____.", options: { A: 'Competition', B: 'Opposition', C: 'Exhibition', D: 'Recognition' } },
      { number: 2, text: 'Her _____ speech at the international conference left a lasting impression on all attendees.', options: { A: 'Evident', B: 'Frequent', C: 'Eloquent', D: 'Relevant' } },
      { number: 3, text: 'Despite numerous _____, the team managed to complete the project ahead of schedule.', options: { A: 'Setbacks', B: 'Drawbacks', C: 'Cutbacks', D: 'Paybacks' } },
      { number: 4, text: 'The discovery was considered _____ because it fundamentally changed scientific thinking.', options: { A: 'Conventional', B: 'Evolutionary', C: 'Traditional', D: 'Revolutionary' } },
      { number: 5, text: 'She showed remarkable _____ in handling the difficult situation calmly and professionally.', options: { A: 'Exposure', B: 'Enclosure', C: 'Composure', D: 'Disclosure' } },
      { number: 6, text: 'The article was criticised for its _____ use of statistics to support an otherwise weak argument.', options: { A: 'Effective', B: 'Selective', C: 'Collective', D: 'Reflective' } },
      { number: 7, text: "The CEO's decision to expand into Asian markets was seen as both _____ and strategically necessary.", options: { A: 'Obvious', B: 'Tedious', C: 'Ambitious', D: 'Previous' } },
      { number: 8, text: "The country's economy has shown encouraging signs of _____ following several years of stagnation.", options: { A: 'Arrival', B: 'Survival', C: 'Interval', D: 'Revival' } },
      { number: 9, text: 'By the time the rescue team arrived, the survivors _____ for over 24 hours.', options: { A: 'Waited', B: 'Have been waiting', C: 'Were waiting', D: 'Had been waiting' } },
      { number: 10, text: 'Not only _____ the deadline, but the team also delivered results that exceeded expectations.', options: { A: 'They met', B: 'Met they', C: 'They did meet', D: 'Did they meet' } },
      { number: 11, text: 'Had the weather been better last weekend, we _____ the outdoor concert.', options: { A: 'Will enjoy', B: 'Would enjoy', C: 'Had enjoyed', D: 'Would have enjoyed' } },
      { number: 12, text: 'The board insisted that every employee _____ the mandatory safety training before April.', options: { A: 'Completes', B: 'Completed', C: 'Complete', D: 'Has completed' } },
      { number: 13, text: '_____ his lack of formal experience, he performed remarkably well throughout the interview.', options: { A: 'Although', B: 'However', C: 'Despite', D: 'Even' } },
      { number: 14, text: 'The annual report, _____ was published last Tuesday, has already attracted international attention.', options: { A: 'That', B: 'Who', C: 'What', D: 'Which' } },
      { number: 15, text: 'She spoke so quietly that I had to ask her to _____.', options: { A: 'Slow down', B: 'Carry on', C: 'Speak up', D: 'Step back' } },
      { number: 16, text: 'It is absolutely essential that the financial results _____ before the board meeting.', options: { A: 'Are verified', B: 'Were verified', C: 'Be verified', D: 'Will be verified' } },
      { number: 17, text: 'The more you practise public speaking, _____ you will become over time.', options: { A: 'The confident', B: 'More confident', C: 'Most confident', D: 'The more confident' } },
      { number: 18, text: 'I would rather you _____ me earlier about the sudden change in plans.', options: { A: 'Tell', B: 'Told', C: 'Have told', D: 'Had told' } },
      { number: 19, text: 'The suspect denied _____ anywhere near the scene of the crime on that evening.', options: { A: 'To be', B: 'To have been', C: 'Being', D: 'Been' } },
      { number: 20, text: 'Rarely _____ such a powerful and moving performance from a first-year student.', options: { A: 'We have seen', B: 'We saw', C: 'Have we seen', D: 'Did we see' } },
      { number: 21, text: 'What distinguishes AI from previous technological revolutions, according to the passage?', passage: AI_PASSAGE, options: { A: 'It is significantly cheaper to develop', B: 'It can automate complex cognitive tasks', C: 'It was invented more recently', D: 'It only operates in developed nations' } },
      { number: 22, text: 'What do supporters of AI argue about its long-term effect on employment?', passage: AI_PASSAGE, options: { A: 'It will eliminate virtually all jobs', B: 'It will only affect manual workers', C: 'It will create more jobs than it removes', D: 'It has no significant effect on employment' } },
      { number: 23, text: 'What concern do critics raise regarding the pace of AI development?', passage: AI_PASSAGE, options: { A: 'It is advancing too slowly', B: 'It is far too expensive', C: 'Society may not adapt quickly enough', D: 'It causes serious environmental damage' } },
      { number: 24, text: 'The word "transferable" in the passage is closest in meaning to _____.', passage: AI_PASSAGE, options: { A: 'Temporary and short-lived', B: 'Useful across different situations', C: 'Difficult and complex to learn', D: 'Directly related to technology' } },
      { number: 25, text: 'What does the writer suggest should be the focus of policymakers?', passage: AI_PASSAGE, options: { A: 'Slowing AI development considerably', B: 'Banning AI from certain industries', C: 'Ensuring AI benefits are widely shared', D: 'Giving technology firms greater freedom' } },
    ],
  },
};

export function getLevel(score: number, cutoffs: LevelCutoff[]): string {
  for (const cutoff of cutoffs) {
    if (score >= cutoff.min && score <= cutoff.max) return cutoff.name;
  }
  return cutoffs[cutoffs.length - 1].name;
}

export function getLevelBadgeStyle(level: string): { backgroundColor: string; color: string } {
  if (level === 'Starter') return { backgroundColor: '#FAEEDA', color: '#633806' };
  if (level === 'Elementary') return { backgroundColor: '#E6F1FB', color: '#0C447C' };
  if (level === 'Pre-Intermediate') return { backgroundColor: '#E1F5EE', color: '#085041' };
  return { backgroundColor: '#EEEDFE', color: '#3C3489' };
}
