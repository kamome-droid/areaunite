import { getCollection, type CollectionEntry } from "astro:content";

const isProd = import.meta.env.PROD;

/** 主役の開催回を1件返す。current:true 優先、なければ日付が新しいもの。 */
export async function getCurrentEvent(): Promise<CollectionEntry<"event"> | undefined> {
  const all = await getCollection("event");
  if (all.length === 0) return undefined;
  const current = all.find((e) => e.data.current);
  if (current) return current;
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())[0];
}

/** 指定グループの項目。time があれば時刻順、なければ order 順。 */
export async function getItems(group: string): Promise<CollectionEntry<"items">[]> {
  const all = await getCollection("items", ({ data }) => {
    if (data.group !== group) return false;
    return isProd ? !data.draft : true;
  });

  return all.sort((a, b) => {
    const at = a.data.time ?? "";
    const bt = b.data.time ?? "";
    if (at && bt && at !== bt) return at.localeCompare(bt);
    if (at && !bt) return -1;
    if (!at && bt) return 1;
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.title.localeCompare(b.data.title, "ja");
  });
}

/** トップページのダイジェスト用。featured を優先し、足りなければ先頭から補う。 */
export async function getFeaturedItems(group: string, limit: number) {
  const items = await getItems(group);
  const featured = items.filter((i) => i.data.featured);
  const rest = items.filter((i) => !i.data.featured);
  return [...featured, ...rest].slice(0, limit);
}

export async function getSponsors() {
  const all = await getCollection("sponsors");
  return all.sort((a, b) => {
    if (a.data.tier !== b.data.tier) return a.data.tier - b.data.tier;
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.name.localeCompare(b.data.name);
  });
}
