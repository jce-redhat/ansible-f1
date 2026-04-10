import { getQuestions } from "../data/questions.js";

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class QuizSystem {
  constructor() {
    this._pool = [];
    this._askedIds = new Set();
  }

  resetPool() {
    const all = getQuestions();
    const unseen = all.filter((q) => !this._askedIds.has(q.id));

    if (unseen.length >= 4) {
      this._pool = shuffle([...unseen]);
    } else {
      this._askedIds.clear();
      this._pool = shuffle([...all]);
    }
  }

  nextQuestion() {
    if (this._pool.length === 0) {
      this._askedIds.clear();
      this._pool = shuffle([...getQuestions()]);
    }
    const raw = this._pool.pop();
    this._askedIds.add(raw.id);

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
