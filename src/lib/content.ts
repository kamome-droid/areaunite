import { getCollection, type CollectionEntry } from "astro:content";
import { groups, parents, site } from "../config/site";

const isProd = import.meta.env.PROD;

/** 主役の開催回を1件返す。current:true 優先、なければ日付が新しいもの。 */
export async function getCurrentEvent(): Promise<CollectionEntry<"event"> | undefined> {
  const all = await getCollection("event");
  if (all.length === 0) return undefined;
  const current = all.find((e) => e.data.current);
  if (current) return current;
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())[0];
}

/** 開催日の索引。id から「何日目か」と「画面に出す日付」を引く。
    日付を項目ごとに書かず、開催回のデータ1か所で持つための仕組み。
    1ページで何度も引くので、組み立ては1回だけにする。 */
let eventDaysCache: Map<string, { order: number; label: string }> | null = null;

export async function getEventDays(): Promise<
  Map<string, { order: number; label: string }>
> {
  if (eventDaysCache) return eventDaysCache;

  const event = await getCurrentEvent();
  const map = new Map<string, { order: number; label: string }>();
  (event?.data.schedule ?? []).forEach((day, order) => {
    map.set(day.id, { order, label: day.note || day.label });
  });
  eventDaysCache = map;
  return map;
}

/** 指定グループの項目。管理画面の一覧で並べ替えた順（order）に並ぶ。
    スケジュールは時刻で組み直すので、ここは一覧ページの見え方だけを決める。 */
export async function getItems(group: string): Promise<CollectionEntry<"items">[]> {
  const all = await getCollection("items", ({ data }) => {
    if (data.group !== group) return false;
    return isProd ? !data.draft : true;
  });

  return all.sort((a, b) => {
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.title.localeCompare(b.data.title, "ja");
  });
}

/** 開催期間の表記。開催日の日付から組み立てる。
    2日以上あるときは、後ろの日から重なる年を省く。
    例）2026.10.17 sat. / 2026.10.18 sun. → 2026.10.17 sat. - 10.18 sun. */
export function dateRangeLabel(days?: { note?: string }[]): string {
  const notes = (days ?? []).map((d) => d.note?.trim()).filter(Boolean) as string[];
  if (notes.length === 0) return "";
  if (notes.length === 1) return notes[0];

  const first = notes[0];
  const last = notes[notes.length - 1];
  const year = first.match(/^\d{4}\./)?.[0];
  return `${first} - ${year && last.startsWith(year) ? last.slice(year.length) : last}`;
}

/** 画面に出す日付。date の直接指定があればそれを、無ければ day から引く。 */
export function displayDate(
  data: { date?: string; day?: string },
  days: Map<string, { label: string }>
): string | undefined {
  return data.date ?? (data.day ? days.get(data.day)?.label : undefined);
}

/** 一覧に出すための項目。画面に出す日付を解決して添える。 */
export async function getItemsView(group: string) {
  const days = await getEventDays();
  const items = await getItems(group);
  return items.map((entry) => ({
    entry,
    date: displayDate(entry.data, days),
  }));
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
  /** タイトルのあとに添える、制作者や登壇者の名前 */
  credit?: string;
  note?: string;
  /** 「ムービー」「DJ」など、その項目の分類名 */
  tag?: string;
  /** 該当する項目のカードへのリンク */
  href?: string;
};
export type ProgramBlock = { part?: string; items: ProgramItem[] };

type ScheduleDay = {
  id?: string;
  time?: string;
  parts: { label: string; startsAt?: string }[];
  extras: { time: string; title: string; note?: string }[];
};

/** その日のコンテンツを分類を問わず時刻順に並べ、見出しで区切ってプログラムにする。
    上映作品などを一覧ページとスケジュールで二重に持たないための仕組みで、
    コンテンツ側に日と時刻を入れれば、ここには何も書かなくても並ぶ。 */
export async function resolveProgram(day: ScheduleDay): Promise<ProgramBlock[]> {
  // 自由記述の行。コンテンツに載せないもの（ゲートオープンなど）
  const items: ProgramItem[] = (day.extras ?? []).map((it) => ({ ...it }));

  for (const group of Object.keys(groups)) {
    const source = await getItems(group);
    // その分類が置かれているページ。個別ページが無ければそこへ飛ばす
    const parent = groups[group].parent;
    const base = parent ? parents[parent].href : "";

    for (const entry of source) {
      if (!entry.data.time) continue;
      // その日のものだけ。日の指定がない項目はどの日にも出す
      if (entry.data.day && day.id && entry.data.day !== day.id) continue;
      items.push({
        tag: groups[group].jp,
        time: entry.data.time,
        title: entry.data.title,
        // 制作者・登壇者は、タイトルのあとに添える
        credit: groups[group].scheduleCredit ? entry.data.subtitle : undefined,
        href: itemHref(group, entry.id) ?? (base ? `${base}#${entry.id}` : undefined),
      });
    }
  }

  // 時刻は "HH:MM" 固定なので文字列比較で並ぶ。同時刻は書いた順のまま
  items.sort((a, b) => a.time.localeCompare(b.time));

  // 見出しも時刻で置き場所が決まる。ある見出しから次の見出しの手前までが1つの部
  const parts = [...(day.parts ?? [])].sort((a, b) =>
    (a.startsAt ?? "").localeCompare(b.startsAt ?? "")
  );

  const blocks: ProgramBlock[] = [{ items: [] }];
  let next = 0;
  for (const item of items) {
    while (next < parts.length && (parts[next].startsAt ?? "") <= item.time) {
      blocks.push({ part: parts[next].label, items: [] });
      next += 1;
    }
    blocks[blocks.length - 1].items.push(item);
  }

  // 中身が無い部は見出しごと出さない
  // （その日に該当する項目がまだ無い、というだけで枠を見せても仕方ない）
  return blocks.filter((b) => b.items.length > 0);
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

  // 片方だけ入っていれば、そこから場所を取り出してもう片方を組み立てる。
  // 2つのURLを手で入れずに済ませるため
  const fromUrl = (url?: string) => {
    if (!url) return "";
    try {
      const p = new URL(url).searchParams;
      return p.get("q") ?? p.get("query") ?? "";
    } catch {
      return "";
    }
  };

  const place = query || fromUrl(ev?.mapEmbed) || fromUrl(ev?.mapUrl);
  const q = encodeURIComponent(place);

  return {
    embed: ev?.mapEmbed || (place ? `https://www.google.com/maps?q=${q}&output=embed` : ""),
    link:
      ev?.mapUrl ||
      (place ? `https://www.google.com/maps/search/?api=1&query=${q}` : ""),
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

/**
 * サイト全体に出る、管理画面から変えられる値。
 * 開催回のファイルに入っていればそれを、無ければ site.ts の既定を使う。
 */
export async function getSiteInfo() {
  const ev = (await getCurrentEvent())?.data;
  return {
    tagline: ev?.tagline || site.tagline,
    description: ev?.description || site.description,
    sns: {
      instagram: ev?.sns?.instagram ?? "",
      x: ev?.sns?.x ?? "",
      youtube: ev?.sns?.youtube ?? "",
    },
    contactEmail: ev?.contactEmail ?? "",
    hashtags: ev?.hashtags ?? [],
  };
}
