export type Profile = {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  subject: string;
  unit: number;
  unit_name: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  created_at: string;
};

export type Match = {
  id: string;
  player1_id: string;
  player2_id: string;
  status: 'waiting' | 'in_progress' | 'completed' | 'abandoned';
  current_round: number;
  player1_score: number;
  player2_score: number;
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
};

export type MatchRound = {
  id: string;
  match_id: string;
  round_number: number;
  question_id: string;
  player1_answer: string | null;
  player1_answer_time: number | null;
  player1_correct: boolean | null;
  player2_answer: string | null;
  player2_answer_time: number | null;
  player2_correct: boolean | null;
  round_winner_id: string | null;
  created_at: string;
};

export type SafeMatchRound = {
  id: string;
  match_id: string;
  round_number: number;
  question_id: string;
  my_answer: string | null;
  my_answer_time: number | null;
  my_correct: boolean | null;
  opponent_answer: string | null;
  opponent_answer_time: number | null;
  opponent_correct: boolean | null;
  both_answered: boolean;
  round_winner_id: string | null;
  created_at: string;
};

export type MatchmakingQueue = {
  id: string;
  user_id: string;
  elo: number;
  joined_at: string;
};
