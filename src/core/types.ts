export type Category = "secret" | "personal" | "name";

export interface Finding {
  start: number;
  end: number;
  value: string;
  type: string;
  category: Category;
  source: "rule" | "model" | "custom";
  score: number;
}

export interface Rule {
  type: string;
  category: Category;
  label: string;
  pattern: RegExp;
  group?: number;
  validate?: (value: string, match: RegExpExecArray, text: string) => boolean;
  score?: number;
}

export interface TypeInfo {
  label: string;
  category: Category;
}
