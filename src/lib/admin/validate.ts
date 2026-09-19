// 保存する前に、サイトと同じ基準（content.config.ts のスキーマ）で中身を確かめる。
// 通らない中身をコミットすると、サイトの作り直しが失敗し、以降の変更が一切出なくなるため。
import yaml from "js-yaml";
import { collections as content } from "../../content.config";
import { collections, type CollectionDef, type Field } from "./schema";

/** 保存先のフォルダから、どのスキーマで確かめるかを決める */
const schemaOf = (def: CollectionDef) => {
  const name = def.dir.split("/").pop() as keyof typeof content;
  const schema = (content[name] as any)?.schema;
  return typeof schema === "function" ? null : schema;
};

/** 項目名を、管理画面の欄の名前にする（同じフォルダを分け合う画面の欄もまとめて探す） */
function labelOf(def: CollectionDef, key: string): string {
  const all: Field[] = Object.values(collections)
    .filter((d) => d.dir === def.dir)
    .flatMap((d) => d.fields);
  const f = all.find((x) => x.name === key && x.type !== "hidden");
  return f?.label ?? key;
}

/**
 * ファイルの中身を確かめる。問題があれば、直し方の分かる文で投げる。
 * 例：「作品タイトル」を入れてください
 */
export function validateFile(def: CollectionDef, text: string) {
  const schema = schemaOf(def);
  if (!schema) return;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const data = (m ? yaml.load(m[1]) : {}) ?? {};
  const result = schema.safeParse(data);
  if (result.success) return;

  const messages = [
    ...new Set(
      result.error.issues.map((issue: any) => {
        const key = String(issue.path?.[0] ?? "");
        const label = labelOf(def, key);
        const missing = issue.code === "invalid_type" && issue.input === undefined;
        if (missing || issue.code === "invalid_value" || issue.code === "invalid_enum_value") {
          return issue.code === "invalid_type" ? `「${label}」を入れてください` : `「${label}」を選んでください`;
        }
        return `「${label}」の形が正しくありません`;
      })
    ),
  ];
  throw new Error(messages.join("／"));
}
