export type SearchRecommendation = {
  label: string;
  query: string;
  reason?: string;
};

import { getLocale, l, type Locale } from "../i18n/i18n";

const has = (s: string, keywords: string[]) => {
  const lower = s.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
};

const uniqByQuery = (items: SearchRecommendation[]) => {
  const seen = new Set<string>();
  const out: SearchRecommendation[] = [];
  for (const item of items) {
    const key = item.query.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

export const getSearchRecommendations = (
  raw: string,
  locale: Locale = getLocale(),
): SearchRecommendation[] => {
  const q = (raw || "").trim();
  if (q.length < 2) return [];

  const recs: SearchRecommendation[] = [];

  const mk = (input: {
    labelZh: string;
    labelEn: string;
    query: string;
    reasonZh?: string;
    reasonEn?: string;
  }): SearchRecommendation => ({
    label: l(input.labelZh, input.labelEn, locale),
    query: input.query,
    reason:
      input.reasonZh && input.reasonEn
        ? l(input.reasonZh, input.reasonEn, locale)
        : undefined,
  });

  // City-based quick picks
  if (has(q, ["sydney", "悉尼"])) {
    recs.push(
      mk({
        labelZh: "悉尼歌剧院",
        labelEn: "Sydney Opera House",
        query: "Sydney Opera House",
        reasonZh: "地标打卡",
        reasonEn: "Landmark",
      }),
      mk({
        labelZh: "邦迪海滩",
        labelEn: "Bondi Beach",
        query: "Bondi Beach",
        reasonZh: "海边散步",
        reasonEn: "Seaside walk",
      }),
      mk({
        labelZh: "海港大桥",
        labelEn: "Sydney Harbour Bridge",
        query: "Sydney Harbour Bridge",
        reasonZh: "观景/拍照",
        reasonEn: "Views & photos",
      }),
      mk({
        labelZh: "塔龙加动物园",
        labelEn: "Taronga Zoo",
        query: "Taronga Zoo",
        reasonZh: "亲子",
        reasonEn: "Family",
      }),
      mk({
        labelZh: "达令港",
        labelEn: "Darling Harbour",
        query: "Darling Harbour",
        reasonZh: "餐饮+夜景",
        reasonEn: "Food + night views",
      }),
    );
  }

  if (has(q, ["tokyo", "东京"])) {
    recs.push(
      mk({
        labelZh: "浅草寺",
        labelEn: "Senso-ji",
        query: "Senso-ji",
        reasonZh: "文化",
        reasonEn: "Culture",
      }),
      mk({
        labelZh: "东京晴空塔",
        labelEn: "Tokyo Skytree",
        query: "Tokyo Skytree",
        reasonZh: "观景",
        reasonEn: "Views",
      }),
      mk({
        labelZh: "上野公园",
        labelEn: "Ueno Park",
        query: "Ueno Park",
        reasonZh: "公园",
        reasonEn: "Park",
      }),
      mk({
        labelZh: "银座购物",
        labelEn: "Ginza shopping",
        query: "Ginza shopping",
        reasonZh: "购物",
        reasonEn: "Shopping",
      }),
    );
  }

  if (has(q, ["kyoto", "京都"])) {
    recs.push(
      mk({
        labelZh: "金阁寺",
        labelEn: "Kinkaku-ji",
        query: "Kinkaku-ji",
        reasonZh: "必去",
        reasonEn: "Must-see",
      }),
      mk({
        labelZh: "清水寺",
        labelEn: "Kiyomizu-dera",
        query: "Kiyomizu-dera",
        reasonZh: "必去",
        reasonEn: "Must-see",
      }),
      mk({
        labelZh: "伏见稻荷大社",
        labelEn: "Fushimi Inari Taisha",
        query: "Fushimi Inari Taisha",
        reasonZh: "千本鸟居",
        reasonEn: "Torii gates",
      }),
      mk({
        labelZh: "岚山竹林",
        labelEn: "Arashiyama Bamboo Grove",
        query: "Arashiyama Bamboo Grove",
        reasonZh: "自然",
        reasonEn: "Nature",
      }),
    );
  }

  // Intent-based recommendations
  if (has(q, ["雨", "雨天", "下雨", "rain", "raining"])) {
    recs.push(
      mk({
        labelZh: "雨天：博物馆",
        labelEn: "Rainy day: museum",
        query: "museum",
        reasonZh: "室内不受天气影响",
        reasonEn: "Indoors",
      }),
      mk({
        labelZh: "雨天：商场",
        labelEn: "Rainy day: mall",
        query: "shopping mall",
        reasonZh: "室内",
        reasonEn: "Indoors",
      }),
      mk({
        labelZh: "雨天：咖啡馆",
        labelEn: "Rainy day: cafe",
        query: "cafe",
        reasonZh: "休息",
        reasonEn: "Coffee break",
      }),
    );
  }

  if (has(q, ["美食", "吃", "餐厅", "food", "eat", "dinner", "lunch"])) {
    recs.push(
      mk({
        labelZh: "拉面",
        labelEn: "Ramen",
        query: "ramen",
        reasonZh: "热门选择",
        reasonEn: "Popular",
      }),
      mk({
        labelZh: "寿司",
        labelEn: "Sushi",
        query: "sushi",
        reasonZh: "热门选择",
        reasonEn: "Popular",
      }),
      mk({
        labelZh: "咖啡馆",
        labelEn: "Cafe",
        query: "cafe",
        reasonZh: "休息",
        reasonEn: "Coffee break",
      }),
    );
  }

  if (has(q, ["购物", "shopping", "outlet", "买", "逛街"])) {
    recs.push(
      mk({
        labelZh: "购物：商场",
        labelEn: "Shopping: mall",
        query: "shopping mall",
        reasonZh: "集中",
        reasonEn: "Convenient",
      }),
      mk({
        labelZh: "购物：奥特莱斯",
        labelEn: "Shopping: outlet",
        query: "outlet",
        reasonZh: "折扣",
        reasonEn: "Deals",
      }),
      mk({
        labelZh: "市场",
        labelEn: "Market",
        query: "market",
        reasonZh: "本地体验",
        reasonEn: "Local vibe",
      }),
    );
  }

  if (has(q, ["亲子", "小孩", "kids", "family"])) {
    recs.push(
      mk({
        labelZh: "动物园",
        labelEn: "Zoo",
        query: "zoo",
        reasonZh: "亲子",
        reasonEn: "Family",
      }),
      mk({
        labelZh: "水族馆",
        labelEn: "Aquarium",
        query: "aquarium",
        reasonZh: "室内亲子",
        reasonEn: "Indoors",
      }),
      mk({
        labelZh: "游乐园",
        labelEn: "Amusement park",
        query: "amusement park",
        reasonZh: "亲子",
        reasonEn: "Family",
      }),
    );
  }

  if (has(q, ["拍照", "打卡", "photo", "instagram", "view", "夜景"])) {
    recs.push(
      mk({
        labelZh: "观景台",
        labelEn: "Observatory",
        query: "observatory",
        reasonZh: "视野好",
        reasonEn: "Views",
      }),
      mk({
        labelZh: "塔/地标",
        labelEn: "Tower / landmark",
        query: "tower",
        reasonZh: "经典打卡",
        reasonEn: "Photo spot",
      }),
      mk({
        labelZh: "夜景",
        labelEn: "Night view",
        query: "night view",
        reasonZh: "傍晚",
        reasonEn: "Evening",
      }),
    );
  }

  if (has(q, ["历史", "文化", "historic", "temple", "shrine", "museum"])) {
    recs.push(
      mk({
        labelZh: "博物馆",
        labelEn: "Museum",
        query: "museum",
        reasonZh: "室内文化",
        reasonEn: "Indoors",
      }),
      mk({
        labelZh: "寺庙/神社",
        labelEn: "Temple / shrine",
        query: "temple",
        reasonZh: "文化",
        reasonEn: "Culture",
      }),
      mk({
        labelZh: "历史景点",
        labelEn: "Historic site",
        query: "historic site",
        reasonZh: "文化",
        reasonEn: "Culture",
      }),
    );
  }

  if (has(q, ["公园", "自然", "nature", "park", "beach"])) {
    recs.push(
      mk({
        labelZh: "公园",
        labelEn: "Park",
        query: "park",
        reasonZh: "散步",
        reasonEn: "Walk",
      }),
      mk({
        labelZh: "花园",
        labelEn: "Garden",
        query: "garden",
        reasonZh: "放松",
        reasonEn: "Relax",
      }),
      mk({
        labelZh: "海滩",
        labelEn: "Beach",
        query: "beach",
        reasonZh: "海边",
        reasonEn: "Seaside",
      }),
    );
  }

  // If user typed something very specific (e.g., a landmark), still provide a couple of generic fallbacks.
  if (recs.length === 0) {
    recs.push(
      mk({
        labelZh: "附近景点",
        labelEn: "Nearby attractions",
        query: `${q} tourist attractions`,
        reasonZh: "探索",
        reasonEn: "Explore",
      }),
      mk({
        labelZh: "附近咖啡馆",
        labelEn: "Nearby cafes",
        query: `${q} cafe`,
        reasonZh: "休息",
        reasonEn: "Coffee break",
      }),
      mk({
        labelZh: "附近餐厅",
        labelEn: "Nearby restaurants",
        query: `${q} restaurant`,
        reasonZh: "吃饭",
        reasonEn: "Food",
      }),
    );
  }

  return uniqByQuery(recs).slice(0, 8);
};
