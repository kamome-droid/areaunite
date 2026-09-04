import { getCollection, type CollectionEntry } from "astro:content";
import { groups, parents } from "../config/site";

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

/* ---------------------------------------------------------
   スケジュールの組み立て
   --------------------------------------------------------- */

export type ProgramItem = {
  time: string;
  title: string;
  note?: string;
  /** 該当する項目のカードへのリンク */
  href?: string;
};
export type ProgramBlock = { part?: string; items: ProgramItem[] };

type ScheduleDay = {
  time?: string;
  program: {
    part?: string;
    include?: string | string[];
    items: { time: string; title: string; note?: string }[];
  }[];
};

/** include を実データに展開して、その日のプログラムを組み立てる。
    上映作品などを一覧ページとスケジュールの二重管理にしないための仕組み。 */
export async function resolveProgram(day: ScheduleDay): Promise<ProgramBlock[]> {
  const blocks: ProgramBlock[] = [];

  for (const block of day.program) {
    const items: ProgramItem[] = [...block.items];

    const includes = block.include
      ? Array.isArray(block.include)
        ? block.include
        : [block.include]
      : [];

    for (const group of includes) {
      const source = await getItems(group);
      // 差し込み元の分類が置かれているページ。個別ページが無ければそこへ飛ばす
      const parent = groups[group]?.parent;
      const base = parent ? parents[parent].href : "";

      for (const entry of source) {
        if (!entry.data.time) continue;
        const bracket =
          groups[group]?.scheduleFormat === "bracket" && entry.data.subtitle;

        items.push({
          time: entry.data.time,
          title: bracket
            ? `${entry.data.subtitle}「${entry.data.title}」`
            : entry.data.title,
          href: itemHref(group, entry.id) ?? (base ? `${base}#${entry.id}` : undefined),
        });
      }
    }

    // 時刻は "HH:MM" 固定なので文字列比較で並ぶ。同時刻は書いた順のまま
    items.sort((a, b) => a.time.localeCompare(b.time));
    blocks.push({ part: block.part, items });
  }

  return blocks;
}

/** トップページに出す「何時から何時まで」。
    明記がなければ、その日のプログラムの最初と最後の時刻から組み立てる。 */
export async function getDayRange(day: ScheduleDay): Promise<string> {
  if (day.time) return day.time;
  const items = (await resolveProgram(day)).flatMap((b) => b.items);
  if (items.length === 0) return "";
  const first = items[0].time;
  const last = items[items.length - 1].time;
  return first === last ? first : `${first}〜${last}`;
}

/* ---------------------------------------------------------
   地図
   --------------------------------------------------------- */

/** 埋め込み地図と「地図で開く」リンクのURL。
    mapEmbed / mapUrl の指定があればそれを使い、なければ住所（なければ会場名）で
    検索する形に組み立てる。会場名を書いただけで地図が出るようにするための処理。 */
export function mapLinks(ev?: {
  venue?: string;
  address?: string;
  mapUrl?: string;
  mapEmbed?: string;
}) {
  const query = ev?.address?.trim() || ev?.venue?.trim() || "";
  if (!query && !ev?.mapEmbed && !ev?.mapUrl) return null;

  const q = encodeURIComponent(query);
  return {
    embed: ev?.mapEmbed || (query ? `https://www.google.com/maps?q=${q}&output=embed` : ""),
    link:
      ev?.mapUrl ||
      (query ? `https://www.google.com/maps/search/?api=1&query=${q}` : ""),
  };
}

/** 項目の個別ページのパス。個別ページを持たない分類なら null */
export function itemHref(group: string, id: string): string | null {
  return groups[group]?.detail ? `/${group}/${id}/` : null;
}

/** YouTubeのURLから動画IDを取り出す */
function youtubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/
  );
  return m ? m[1] : null;
}

/** YouTube / Vimeo のURLを埋め込み用に変換する。対応外ならnull。
    YouTubeは追跡の少ない nocookie ドメインを使う。 */
export function embedUrl(url?: string): string | null {
  if (!url) return null;
  const yt = youtubeId(url);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt}`;

  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}

/** 一覧のカードに出す静止画。
    image が指定されていればそれを、無ければ YouTube のサムネイルを使う。
    動画リンクだけもらった作品でも、カードに絵が出るようにするため。
    （hqdefault は 4:3 だが、16:9 で切り抜くとちょうど映像部分だけが残る） */
export function itemThumb(data: { image?: string; video?: string }): string | undefined {
  if (data.image) return data.image;
  const yt = youtubeId(data.video);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : undefined;
}
