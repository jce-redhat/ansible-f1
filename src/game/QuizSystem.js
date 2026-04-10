import { getQuestions } from "../data/questions.js";

const STORAGE_KEY = "builtToAutomate_askedQuestionIds";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadAskedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveAskedIds(idSet) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...idSet]));
  } catch { /* ignore */ }
}

export class QuizSystem {
  constructor() {
    this._pool = [];
    this._askedIds = loadAskedIds();
  }

  resetPool() {
    if (this._pool.length > 0) return;
    this._refillPool();
  }

  _refillPool() {
    const all = getQuestions();
    const unseen = all.filter((q) => !this._askedIds.has(q.id));

    if (unseen.length >= 4) {
      this._pool = shuffle([...unseen]);
    } else {
      this._askedIds.clear();
      saveAskedIds(this._askedIds);
      this._pool = shuffle([...all]);
    }
  }

  nextQuestion() {
    if (this._pool.length === 0) this._refillPool();

    const raw = this._pool.pop();
    this._askedIds.add(raw.id);
    saveAskedIds(this._askedIds);

    const indices = [0, 1, 2, 3];
    shuffle(indices);
    const shuffledOptions = indices.map((i) => raw.options[i]);
    const newAnswer = indices.indexOf(raw.answer);

    return {
      ...raw,
      options: shuffledOptions,
      answer: newAnswer,
    };
  }

  isCorrect(question, optionIndex) {
    return optionIndex === question.answer;
  }
}
