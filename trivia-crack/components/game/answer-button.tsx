'use client';

import { KaTeXText } from './katex-text';

type AnswerButtonProps = {
  label: string;
  text: string;
  selected: boolean;
  correct?: boolean | null;
  disabled: boolean;
  showResult: boolean;
  onClick: () => void;
};

export function AnswerButton({ label, text, selected, correct, disabled, showResult, onClick }: AnswerButtonProps) {
  let bgClass = 'bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 hover:border-gray-600';

  if (showResult) {
    if (correct === true && selected) {
      bgClass = 'bg-green-900/50 border-green-500';
    } else if (correct === false && selected) {
      bgClass = 'bg-red-900/50 border-red-500';
    } else if (correct === true) {
      bgClass = 'bg-green-900/30 border-green-500/50';
    } else {
      bgClass = 'bg-gray-800/30 border-gray-700/50 opacity-50';
    }
  } else if (selected) {
    bgClass = 'bg-indigo-900/50 border-indigo-500';
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${bgClass} disabled:cursor-not-allowed`}
    >
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
          selected
            ? showResult
              ? correct ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              : 'bg-indigo-500 text-white'
            : 'bg-gray-700 text-gray-300'
        }`}>
          {label}
        </span>
        <span className="text-white text-lg leading-relaxed">
          <KaTeXText text={text} />
        </span>
      </div>
    </button>
  );
}
