import { colors } from "./theme";

export interface Model {
  id: string;
  name: string;
  shortName: string;
  provider: string;
  providerColor: string;
  contextWindow: number;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: colors.anthropic,
  OpenAI: colors.openai,
  Google: colors.google,
  DeepSeek: colors.deepseek,
  Meta: colors.meta,
  Mistral: colors.mistral,
};

export const models: Model[] = [
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    shortName: "Sonnet 4.6",
    provider: "Anthropic",
    providerColor: PROVIDER_COLORS.Anthropic,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-opus-4-6",
    name: "Claude Opus 4.6",
    shortName: "Opus 4.6",
    provider: "Anthropic",
    providerColor: PROVIDER_COLORS.Anthropic,
    contextWindow: 200000,
  },
  {
    id: "anthropic/claude-sonnet-4-5",
    name: "Claude Sonnet 4.5",
    shortName: "Sonnet 4.5",
    provider: "Anthropic",
    providerColor: PROVIDER_COLORS.Anthropic,
    contextWindow: 200000,
  },
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    shortName: "GPT-5.4",
    provider: "OpenAI",
    providerColor: PROVIDER_COLORS.OpenAI,
    contextWindow: 128000,
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    shortName: "GPT-4o",
    provider: "OpenAI",
    providerColor: PROVIDER_COLORS.OpenAI,
    contextWindow: 128000,
  },
  {
    id: "google/gemini-3-flash-preview",
    name: "Gemini 3 Flash",
    shortName: "Gemini 3",
    provider: "Google",
    providerColor: PROVIDER_COLORS.Google,
    contextWindow: 1000000,
  },
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    shortName: "Flash Lite",
    provider: "Google",
    providerColor: PROVIDER_COLORS.Google,
    contextWindow: 1000000,
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    shortName: "DeepSeek R1",
    provider: "DeepSeek",
    providerColor: PROVIDER_COLORS.DeepSeek,
    contextWindow: 128000,
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    shortName: "Llama 70B",
    provider: "Meta",
    providerColor: PROVIDER_COLORS.Meta,
    contextWindow: 128000,
  },
  {
    id: "mistralai/mistral-large",
    name: "Mistral Large",
    shortName: "Mistral",
    provider: "Mistral",
    providerColor: PROVIDER_COLORS.Mistral,
    contextWindow: 128000,
  },
];

export const DEFAULT_MODEL_ID = "anthropic/claude-sonnet-4-6";
export const defaultModel = models.find((m) => m.id === DEFAULT_MODEL_ID)!;
