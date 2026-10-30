'use client';

import type { Question } from '@/lib/types/database';
import { KaTeXText } from './katex-text';
import { AnswerButton } from './answer-button';

type QuestionCardProps = {
  question: Question;
  selectedAnswer: string | null;
  showResult: boolean;
  correctAnswer?: string;
  disabled: boolean;
  onAnswer: (answer: string) => void;
};

export function QuestionCard({ question, selectedAnswer, showResult, correctAnswer, disabled, onAnswer }: QuestionCardProps) {
  const options = [
    { label: 'A', text: question.option_a },
    { label: 'B', text: question.option_b },
    { label: 'C', text: question.option_c },
    { label: 'D', text: question.option_d },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Unit badge */}
      <div className="flex items-center gap-2">
        <span className="px-3 py-1 rounded-full bg-gray-800 text-gray-400 text-xs font-medium">
          Unit {question.unit}: {question.unit_name}
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          question.difficulty === 'easy' ? 'bg-green-900/50 text-green-400' :
          question.difficulty === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
          'bg-red-900/50 text-red-400'
        }`}>
          {question.difficulty}
        </span>
      </div>

      {/* Question text */}
      <div className="text-xl text-white leading-relaxed">
        <KaTeXText text={question.question_text} />
      </div>

      {/* Answer options */}
      <div className="grid gap-3">
        {options.map((opt) => (
          <AnswerButton
            key={opt.label}
            label={opt.label}
            text={opt.text}
            selected={selectedAnswer === opt.label}
            correct={showResult ? opt.label === correctAnswer : null}
            disabled={disabled || selectedAnswer !== null}
            showResult={showResult}
            onClick={() => onAnswer(opt.label)}
          />
        ))}
      </div>
    </div>
  );
}
