// Static supplemental-exercise bank, keyed by quiz subskill.
// composeWorksheet() builds a deterministic printable sheet targeting weak subskills.

import type { QuizKey } from './quizData';
import { QUIZ_SETS } from './quizData';

export type ExerciseType = 'fill_blank' | 'choose' | 'rewrite_negative' | 'rewrite_question' | 'unscramble' | 'correct_mistake';

export interface Exercise {
  id: string;
  subskill: string;
  type: ExerciseType;
  prompt: string;
  answer: string;
}

export const EXERCISE_TYPE_INSTRUCTIONS: Record<ExerciseType, string> = {
  fill_blank: 'เติมกริยาในช่องว่างให้ถูกต้อง (Fill in the blanks)',
  choose: 'เลือกคำตอบที่ถูกต้อง (Circle the correct answer)',
  rewrite_negative: 'เปลี่ยนประโยคให้เป็นปฏิเสธ (Rewrite as negative sentences)',
  rewrite_question: 'เปลี่ยนประโยคให้เป็นคำถาม (Rewrite as questions)',
  unscramble: 'เรียงคำให้เป็นประโยคที่ถูกต้อง (Put the words in order)',
  correct_mistake: 'หาที่ผิดแล้วแก้ให้ถูก (Find and correct the mistake)',
};

function ex(subskill: string, n: number, type: ExerciseType, prompt: string, answer: string): Exercise {
  return { id: `${subskill}-${String(n).padStart(2, '0')}`, subskill, type, prompt, answer };
}

export const EXERCISES: Exercise[] = [
  // ── ps_third_person_s ──
  ex('ps_third_person_s', 1, 'fill_blank', 'My sister ______ (like) chocolate.', 'likes'),
  ex('ps_third_person_s', 2, 'fill_blank', 'He ______ (watch) cartoons every evening.', 'watches'),
  ex('ps_third_person_s', 3, 'fill_blank', 'The bird ______ (fly) in the sky.', 'flies'),
  ex('ps_third_person_s', 4, 'fill_blank', 'They ______ (play) games after dinner.', 'play'),
  ex('ps_third_person_s', 5, 'fill_blank', 'Dara ______ (go) to bed at 9 o\'clock.', 'goes'),
  ex('ps_third_person_s', 6, 'choose', 'My dad ( wash / washes ) his car on Sunday.', 'washes'),
  ex('ps_third_person_s', 7, 'choose', 'The students ( study / studies ) English at school.', 'study'),
  ex('ps_third_person_s', 8, 'choose', 'It ( rain / rains ) a lot in June.', 'rains'),
  ex('ps_third_person_s', 9, 'correct_mistake', 'She play badminton every day.', 'She plays badminton every day.'),
  ex('ps_third_person_s', 10, 'correct_mistake', 'My brother watch TV at night.', 'My brother watches TV at night.'),
  ex('ps_third_person_s', 11, 'correct_mistake', 'The dogs barks loudly.', 'The dogs bark loudly.'),
  ex('ps_third_person_s', 12, 'unscramble', 'to / every / school / walks / He / day', 'He walks to school every day.'),

  // ── ps_verb_to_be ──
  ex('ps_verb_to_be', 1, 'fill_blank', 'I ______ ten years old.', 'am'),
  ex('ps_verb_to_be', 2, 'fill_blank', 'My mother ______ a nurse.', 'is'),
  ex('ps_verb_to_be', 3, 'fill_blank', 'We ______ in the classroom.', 'are'),
  ex('ps_verb_to_be', 4, 'fill_blank', 'The cats ______ hungry.', 'are'),
  ex('ps_verb_to_be', 5, 'choose', 'My friends ( is / are ) very funny.', 'are'),
  ex('ps_verb_to_be', 6, 'choose', 'I ( am / is ) happy today.', 'am'),
  ex('ps_verb_to_be', 7, 'choose', 'The weather ( is / are ) hot.', 'is'),
  ex('ps_verb_to_be', 8, 'correct_mistake', 'She are my best friend.', 'She is my best friend.'),
  ex('ps_verb_to_be', 9, 'correct_mistake', 'They is at the park.', 'They are at the park.'),
  ex('ps_verb_to_be', 10, 'unscramble', 'teacher / is / My / kind / very', 'My teacher is very kind.'),

  // ── ps_do_does_negative ──
  ex('ps_do_does_negative', 1, 'fill_blank', 'She ______ (not / like) spicy food.', 'doesn\'t like'),
  ex('ps_do_does_negative', 2, 'fill_blank', 'We ______ (not / play) football on Monday.', 'don\'t play'),
  ex('ps_do_does_negative', 3, 'fill_blank', 'He ______ (not / drink) milk.', 'doesn\'t drink'),
  ex('ps_do_does_negative', 4, 'choose', 'I ( don\'t / doesn\'t ) understand this word.', 'don\'t'),
  ex('ps_do_does_negative', 5, 'choose', 'My cat ( don\'t / doesn\'t ) eat vegetables.', 'doesn\'t'),
  ex('ps_do_does_negative', 6, 'rewrite_negative', 'She speaks Chinese.', 'She doesn\'t speak Chinese.'),
  ex('ps_do_does_negative', 7, 'rewrite_negative', 'They live in Bangkok.', 'They don\'t live in Bangkok.'),
  ex('ps_do_does_negative', 8, 'rewrite_negative', 'He plays the guitar.', 'He doesn\'t play the guitar.'),
  ex('ps_do_does_negative', 9, 'rewrite_negative', 'I eat breakfast at home.', 'I don\'t eat breakfast at home.'),
  ex('ps_do_does_negative', 10, 'correct_mistake', 'She doesn\'t likes coffee.', 'She doesn\'t like coffee.'),
  ex('ps_do_does_negative', 11, 'correct_mistake', 'He don\'t go to school by bus.', 'He doesn\'t go to school by bus.'),

  // ── ps_do_does_question ──
  ex('ps_do_does_question', 1, 'fill_blank', '______ you like pizza?', 'Do'),
  ex('ps_do_does_question', 2, 'fill_blank', '______ she work in a hospital?', 'Does'),
  ex('ps_do_does_question', 3, 'fill_blank', '______ they study English on Saturday?', 'Do'),
  ex('ps_do_does_question', 4, 'choose', '( Do / Does ) your brother play games?', 'Does'),
  ex('ps_do_does_question', 5, 'choose', 'Does she ( sing / sings ) well?', 'sing'),
  ex('ps_do_does_question', 6, 'rewrite_question', 'He likes English. (Yes/No question)', 'Does he like English?'),
  ex('ps_do_does_question', 7, 'rewrite_question', 'They play football after school. (Yes/No question)', 'Do they play football after school?'),
  ex('ps_do_does_question', 8, 'rewrite_question', 'She reads books at night. (Yes/No question)', 'Does she read books at night?'),
  ex('ps_do_does_question', 9, 'unscramble', 'like / you / Do / mangoes / ?', 'Do you like mangoes?'),
  ex('ps_do_does_question', 10, 'correct_mistake', 'Does he plays tennis?', 'Does he play tennis?'),

  // ── ps_wh_question ──
  ex('ps_wh_question', 1, 'fill_blank', 'Where ______ you live?', 'do'),
  ex('ps_wh_question', 2, 'fill_blank', 'What time ______ she wake up?', 'does'),
  ex('ps_wh_question', 3, 'choose', 'What ( do / does ) your father do?', 'does'),
  ex('ps_wh_question', 4, 'choose', 'Where ( do / does ) they play football?', 'do'),
  ex('ps_wh_question', 5, 'unscramble', 'does / Where / live / she / ?', 'Where does she live?'),
  ex('ps_wh_question', 6, 'unscramble', 'you / What / do / want / ?', 'What do you want?'),
  ex('ps_wh_question', 7, 'unscramble', 'time / does / What / start / school / ?', 'What time does school start?'),
  ex('ps_wh_question', 8, 'correct_mistake', 'Where does she lives?', 'Where does she live?'),
  ex('ps_wh_question', 9, 'correct_mistake', 'What time you go to school?', 'What time do you go to school?'),
  ex('ps_wh_question', 10, 'rewrite_question', 'She lives in Chiang Mai. (ถามด้วย Where)', 'Where does she live?'),

  // ── ps_usage_signal ──
  ex('ps_usage_signal', 1, 'choose', 'I ( play / am playing ) football every Saturday.', 'play'),
  ex('ps_usage_signal', 2, 'choose', 'She ( drinks / drank ) coffee every morning.', 'drinks'),
  ex('ps_usage_signal', 3, 'choose', 'They ( visit / visited ) their grandma every month.', 'visit'),
  ex('ps_usage_signal', 4, 'fill_blank', 'He always ______ (do) his homework after dinner.', 'does'),
  ex('ps_usage_signal', 5, 'fill_blank', 'We usually ______ (have) lunch at noon.', 'have'),
  ex('ps_usage_signal', 6, 'fill_blank', 'My mom ______ (cook) dinner every evening.', 'cooks'),
  ex('ps_usage_signal', 7, 'correct_mistake', 'I am going to school every day.', 'I go to school every day.'),
  ex('ps_usage_signal', 8, 'correct_mistake', 'She watched TV every night.', 'She watches TV every night.'),
  ex('ps_usage_signal', 9, 'unscramble', 'always / early / gets up / She', 'She always gets up early.'),
  ex('ps_usage_signal', 10, 'unscramble', 'sometimes / We / at / eat / restaurant / a', 'We sometimes eat at a restaurant.'),

  // ── pc_verb_ing ──
  ex('pc_verb_ing', 1, 'fill_blank', 'She is ______ (read) a comic book.', 'reading'),
  ex('pc_verb_ing', 2, 'fill_blank', 'They are ______ (swim) in the sea.', 'swimming'),
  ex('pc_verb_ing', 3, 'fill_blank', 'He is ______ (write) a letter.', 'writing'),
  ex('pc_verb_ing', 4, 'fill_blank', 'The children are ______ (run) in the park.', 'running'),
  ex('pc_verb_ing', 5, 'fill_blank', 'I am ______ (make) a cake.', 'making'),
  ex('pc_verb_ing', 6, 'fill_blank', 'She is ______ (sit) on the sofa.', 'sitting'),
  ex('pc_verb_ing', 7, 'choose', 'He is ( danceing / dancing ) on the stage.', 'dancing'),
  ex('pc_verb_ing', 8, 'choose', 'The dog is ( runing / running ) after the ball.', 'running'),
  ex('pc_verb_ing', 9, 'correct_mistake', 'She is writeing her homework.', 'She is writing her homework.'),
  ex('pc_verb_ing', 10, 'correct_mistake', 'They are swiming in the pool.', 'They are swimming in the pool.'),

  // ── pc_be_choice ──
  ex('pc_be_choice', 1, 'fill_blank', 'I ______ doing my homework now.', 'am'),
  ex('pc_be_choice', 2, 'fill_blank', 'She ______ talking on the phone.', 'is'),
  ex('pc_be_choice', 3, 'fill_blank', 'We ______ watching a movie.', 'are'),
  ex('pc_be_choice', 4, 'fill_blank', 'The birds ______ singing in the tree.', 'are'),
  ex('pc_be_choice', 5, 'choose', 'My brother ( is / are ) playing games.', 'is'),
  ex('pc_be_choice', 6, 'choose', 'I ( am / is ) listening to music.', 'am'),
  ex('pc_be_choice', 7, 'choose', 'The students ( is / are ) reading books.', 'are'),
  ex('pc_be_choice', 8, 'correct_mistake', 'They is eating lunch now.', 'They are eating lunch now.'),
  ex('pc_be_choice', 9, 'correct_mistake', 'She are cooking in the kitchen.', 'She is cooking in the kitchen.'),
  ex('pc_be_choice', 10, 'unscramble', 'is / now / He / sleeping', 'He is sleeping now.'),

  // ── pc_negative ──
  ex('pc_negative', 1, 'fill_blank', 'She ______ (not / sleep) now.', 'isn\'t sleeping'),
  ex('pc_negative', 2, 'fill_blank', 'They ______ (not / play) football at the moment.', 'aren\'t playing'),
  ex('pc_negative', 3, 'fill_blank', 'I ______ (not / watch) TV right now.', 'am not watching'),
  ex('pc_negative', 4, 'choose', 'He ( isn\'t / doesn\'t ) doing his homework now.', 'isn\'t'),
  ex('pc_negative', 5, 'choose', 'We ( aren\'t / don\'t ) studying math now.', 'aren\'t'),
  ex('pc_negative', 6, 'rewrite_negative', 'She is reading a book.', 'She isn\'t reading a book.'),
  ex('pc_negative', 7, 'rewrite_negative', 'They are swimming.', 'They aren\'t swimming.'),
  ex('pc_negative', 8, 'rewrite_negative', 'I am eating rice.', 'I am not eating rice.'),
  ex('pc_negative', 9, 'correct_mistake', 'He doesn\'t playing games now.', 'He isn\'t playing games now.'),
  ex('pc_negative', 10, 'correct_mistake', 'She isn\'t sleeps now.', 'She isn\'t sleeping now.'),

  // ── pc_question ──
  ex('pc_question', 1, 'fill_blank', '______ she cooking dinner?', 'Is'),
  ex('pc_question', 2, 'fill_blank', '______ they playing in the garden?', 'Are'),
  ex('pc_question', 3, 'fill_blank', 'What ______ you doing?', 'are'),
  ex('pc_question', 4, 'choose', '( Is / Are ) the baby sleeping?', 'Is'),
  ex('pc_question', 5, 'choose', '( Is / Are ) your friends coming?', 'Are'),
  ex('pc_question', 6, 'rewrite_question', 'He is watching TV. (Yes/No question)', 'Is he watching TV?'),
  ex('pc_question', 7, 'rewrite_question', 'They are eating lunch. (Yes/No question)', 'Are they eating lunch?'),
  ex('pc_question', 8, 'unscramble', 'you / What / doing / are / ?', 'What are you doing?'),
  ex('pc_question', 9, 'unscramble', 'she / Is / cooking / ?', 'Is she cooking?'),
  ex('pc_question', 10, 'correct_mistake', 'Where you are going?', 'Where are you going?'),

  // ── pc_usage_signal ──
  ex('pc_usage_signal', 1, 'choose', 'Listen! Someone ( sings / is singing ).', 'is singing'),
  ex('pc_usage_signal', 2, 'choose', 'Look! The bus ( comes / is coming ).', 'is coming'),
  ex('pc_usage_signal', 3, 'choose', 'I usually ( walk / am walking ) to school, but today I ( take / am taking ) the bus.', 'walk / am taking'),
  ex('pc_usage_signal', 4, 'fill_blank', 'Be quiet! The baby ______ (sleep).', 'is sleeping'),
  ex('pc_usage_signal', 5, 'fill_blank', 'Right now, we ______ (study) English.', 'are studying'),
  ex('pc_usage_signal', 6, 'fill_blank', 'She ______ (watch) TV every day, but she ______ (read) a book now.', 'watches / is reading'),
  ex('pc_usage_signal', 7, 'correct_mistake', 'Look! It rains.', 'Look! It is raining.'),
  ex('pc_usage_signal', 8, 'correct_mistake', 'I am playing football every Saturday.', 'I play football every Saturday.'),
  ex('pc_usage_signal', 9, 'unscramble', 'now / is / raining / It', 'It is raining now.'),
  ex('pc_usage_signal', 10, 'unscramble', 'moment / at / working / is / She / the', 'She is working at the moment.'),

  // ── pt_regular_ed ──
  ex('pt_regular_ed', 1, 'fill_blank', 'I ______ (play) games yesterday.', 'played'),
  ex('pt_regular_ed', 2, 'fill_blank', 'She ______ (study) hard last night.', 'studied'),
  ex('pt_regular_ed', 3, 'fill_blank', 'We ______ (live) in Phuket two years ago.', 'lived'),
  ex('pt_regular_ed', 4, 'fill_blank', 'He ______ (stop) the car at the red light.', 'stopped'),
  ex('pt_regular_ed', 5, 'fill_blank', 'They ______ (watch) a movie last weekend.', 'watched'),
  ex('pt_regular_ed', 6, 'choose', 'She ( cryed / cried ) at the sad movie.', 'cried'),
  ex('pt_regular_ed', 7, 'choose', 'We ( planed / planned ) a trip last month.', 'planned'),
  ex('pt_regular_ed', 8, 'correct_mistake', 'I studyed English yesterday.', 'I studied English yesterday.'),
  ex('pt_regular_ed', 9, 'correct_mistake', 'He walkked to school this morning.', 'He walked to school this morning.'),
  ex('pt_regular_ed', 10, 'unscramble', 'yesterday / cleaned / She / room / her', 'She cleaned her room yesterday.'),

  // ── pt_irregular ──
  ex('pt_irregular', 1, 'fill_blank', 'We ______ (go) to the beach last summer.', 'went'),
  ex('pt_irregular', 2, 'fill_blank', 'She ______ (eat) noodles for lunch.', 'ate'),
  ex('pt_irregular', 3, 'fill_blank', 'I ______ (see) a big elephant at the zoo.', 'saw'),
  ex('pt_irregular', 4, 'fill_blank', 'He ______ (buy) a new bicycle last week.', 'bought'),
  ex('pt_irregular', 5, 'fill_blank', 'They ______ (have) a party last night.', 'had'),
  ex('pt_irregular', 6, 'fill_blank', 'She ______ (come) home late yesterday.', 'came'),
  ex('pt_irregular', 7, 'choose', 'I ( taked / took ) many photos on my trip.', 'took'),
  ex('pt_irregular', 8, 'choose', 'He ( goed / went ) to the market this morning.', 'went'),
  ex('pt_irregular', 9, 'correct_mistake', 'She eated rice for breakfast.', 'She ate rice for breakfast.'),
  ex('pt_irregular', 10, 'correct_mistake', 'I seed my friend at the mall.', 'I saw my friend at the mall.'),
  ex('pt_irregular', 11, 'unscramble', 'went / We / zoo / the / to / yesterday', 'We went to the zoo yesterday.'),
  ex('pt_irregular', 12, 'unscramble', 'a / She / letter / wrote / grandma / to / her', 'She wrote a letter to her grandma.'),

  // ── pt_was_were ──
  ex('pt_was_were', 1, 'fill_blank', 'I ______ tired last night.', 'was'),
  ex('pt_was_were', 2, 'fill_blank', 'They ______ at school yesterday.', 'were'),
  ex('pt_was_were', 3, 'fill_blank', 'The weather ______ hot last week.', 'was'),
  ex('pt_was_were', 4, 'fill_blank', 'We ______ happy at the party.', 'were'),
  ex('pt_was_were', 5, 'choose', 'She ( was / were ) sick yesterday.', 'was'),
  ex('pt_was_were', 6, 'choose', 'My parents ( was / were ) at work.', 'were'),
  ex('pt_was_were', 7, 'rewrite_negative', 'The food was delicious.', 'The food wasn\'t delicious.'),
  ex('pt_was_were', 8, 'rewrite_question', 'They were at home. (Yes/No question)', 'Were they at home?'),
  ex('pt_was_were', 9, 'correct_mistake', 'I were very hungry.', 'I was very hungry.'),
  ex('pt_was_were', 10, 'correct_mistake', 'They was at the beach.', 'They were at the beach.'),

  // ── pt_did_negative ──
  ex('pt_did_negative', 1, 'fill_blank', 'She ______ (not / go) to school yesterday.', 'didn\'t go'),
  ex('pt_did_negative', 2, 'fill_blank', 'We ______ (not / watch) TV last night.', 'didn\'t watch'),
  ex('pt_did_negative', 3, 'fill_blank', 'He ______ (not / eat) breakfast this morning.', 'didn\'t eat'),
  ex('pt_did_negative', 4, 'choose', 'I ( don\'t / didn\'t ) see him yesterday.', 'didn\'t'),
  ex('pt_did_negative', 5, 'choose', 'She didn\'t ( played / play ) the piano.', 'play'),
  ex('pt_did_negative', 6, 'rewrite_negative', 'They went to the park.', 'They didn\'t go to the park.'),
  ex('pt_did_negative', 7, 'rewrite_negative', 'She bought a new dress.', 'She didn\'t buy a new dress.'),
  ex('pt_did_negative', 8, 'rewrite_negative', 'He ate all the cake.', 'He didn\'t eat all the cake.'),
  ex('pt_did_negative', 9, 'correct_mistake', 'He didn\'t went to work.', 'He didn\'t go to work.'),
  ex('pt_did_negative', 10, 'correct_mistake', 'We didn\'t saw the movie.', 'We didn\'t see the movie.'),

  // ── pt_did_question ──
  ex('pt_did_question', 1, 'fill_blank', '______ you sleep well last night?', 'Did'),
  ex('pt_did_question', 2, 'fill_blank', '______ she finish her homework?', 'Did'),
  ex('pt_did_question', 3, 'fill_blank', 'Where ______ you go last weekend?', 'did'),
  ex('pt_did_question', 4, 'choose', 'Did he ( win / won ) the game?', 'win'),
  ex('pt_did_question', 5, 'choose', '( Did / Do ) they visit you yesterday?', 'Did'),
  ex('pt_did_question', 6, 'rewrite_question', 'She went to the market. (Yes/No question)', 'Did she go to the market?'),
  ex('pt_did_question', 7, 'rewrite_question', 'They played football. (Yes/No question)', 'Did they play football?'),
  ex('pt_did_question', 8, 'unscramble', 'you / Did / movie / the / see / ?', 'Did you see the movie?'),
  ex('pt_did_question', 9, 'correct_mistake', 'Did you went to school yesterday?', 'Did you go to school yesterday?'),
  ex('pt_did_question', 10, 'correct_mistake', 'Did she finished the test?', 'Did she finish the test?'),

  // ── pt_usage_signal ──
  ex('pt_usage_signal', 1, 'choose', 'I ( go / went ) to Chiang Mai last year.', 'went'),
  ex('pt_usage_signal', 2, 'choose', 'She ( watches / watched ) a movie yesterday.', 'watched'),
  ex('pt_usage_signal', 3, 'choose', 'We ( play / played ) football two days ago.', 'played'),
  ex('pt_usage_signal', 4, 'fill_blank', 'He ______ (visit) his uncle last month.', 'visited'),
  ex('pt_usage_signal', 5, 'fill_blank', 'They ______ (be) in Japan three years ago.', 'were'),
  ex('pt_usage_signal', 6, 'fill_blank', 'I ______ (meet) my friend yesterday.', 'met'),
  ex('pt_usage_signal', 7, 'correct_mistake', 'She goes shopping last Sunday.', 'She went shopping last Sunday.'),
  ex('pt_usage_signal', 8, 'correct_mistake', 'I eat pizza last night.', 'I ate pizza last night.'),
  ex('pt_usage_signal', 9, 'unscramble', 'ago / arrived / two / They / hours', 'They arrived two hours ago.'),
  ex('pt_usage_signal', 10, 'unscramble', 'last / He / his / washed / car / weekend', 'He washed his car last weekend.'),
];

// ─── Worksheet composition ───────────────────────────────────────────────────

export interface WorksheetSection {
  subskill: string;
  items: Exercise[];
}

/**
 * Deterministically compose a worksheet targeting the given weak subskills.
 * - Up to 3 weakest subskills; item allocation 8/6/4 (1 weak → 12, 2 weak → 8/6).
 * - No weak subskills → mixed review: 2 items per subskill of the quiz set.
 */
export function composeWorksheet(quizKey: QuizKey, weakSubskills: string[]): WorksheetSection[] {
  const setSubskills = QUIZ_SETS[quizKey].subskills.map(s => s.key);
  const valid = weakSubskills.filter(sk => setSubskills.includes(sk));

  if (valid.length === 0) {
    return setSubskills
      .map(sk => ({ subskill: sk, items: pickItems(sk, 2) }))
      .filter(sec => sec.items.length > 0);
  }

  const targets = valid.slice(0, 3);
  const allocations = targets.length === 1 ? [12] : targets.length === 2 ? [8, 6] : [8, 6, 4];

  return targets.map((sk, i) => ({ subskill: sk, items: pickItems(sk, allocations[i]) }));
}

/** Pick up to n items for a subskill, round-robin across exercise types for variety. */
function pickItems(subskill: string, n: number): Exercise[] {
  const pool = EXERCISES.filter(e => e.subskill === subskill);
  const byType = new Map<ExerciseType, Exercise[]>();
  pool.forEach(e => {
    if (!byType.has(e.type)) byType.set(e.type, []);
    byType.get(e.type)!.push(e);
  });
  const types = [...byType.keys()];
  const picked: Exercise[] = [];
  let round = 0;
  while (picked.length < n && picked.length < pool.length) {
    for (const t of types) {
      const list = byType.get(t)!;
      if (round < list.length) {
        picked.push(list[round]);
        if (picked.length >= n) break;
      }
    }
    round += 1;
  }
  // Group by type so the sheet prints one instruction per block
  return picked.sort((a, b) => a.type === b.type ? a.id.localeCompare(b.id) : a.type.localeCompare(b.type));
}
