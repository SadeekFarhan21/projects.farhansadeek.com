export type GamePhase =
  | 'loading'
  | 'ready'
  | 'answering'
  | 'waiting'
  | 'round_result'
  | 'match_complete'
  | 'match_abandoned';

export type RoundResult = {
  roundNumber: number;
  myAnswer: string | null;
  opponentAnswer: string | null;
  correctAnswer: string;
  myCorrect: boolean;
  opponentCorrect: boolean;
  myTime: number | null;
  opponentTime: number | null;
  winnerId: string | null;
};

export type MatchResult = {
  matchId: string;
  myScore: number;
  opponentScore: number;
  winnerId: string | null;
  rounds: RoundResult[];
  myEloChange: number;
};

export type PlayerInfo = {
  id: string;
  username: string;
  elo: number;
  isPlayer1: boolean;
};
