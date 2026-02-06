import { getLocale, l, type Locale } from "../i18n/i18n";

export const normalizePriceLevel = (value: any): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    if (n >= 0 && n <= 4) return n;
    return undefined;
  }

  if (typeof value === "string") {
    const v = value.toUpperCase();
    const map: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
      FREE: 0,
      INEXPENSIVE: 1,
      MODERATE: 2,
      EXPENSIVE: 3,
      VERY_EXPENSIVE: 4,
    };
    return map[v];
  }

  return undefined;
};

export const formatSpendLevel = (
  priceLevel?: number,
  locale: Locale = getLocale(),
): string | null => {
  if (priceLevel == null) return null;
  const n = normalizePriceLevel(priceLevel);
  if (n == null) return null;

  switch (n) {
    case 0:
      return l("免费/几乎不花钱", "Free / almost free", locale);
    case 1:
      return l("便宜", "Budget", locale);
    case 2:
      return l("中等", "Moderate", locale);
    case 3:
      return l("偏贵", "Pricey", locale);
    case 4:
      return l("很贵", "Very expensive", locale);
    default:
      return null;
  }
};

export const formatSpendSummary = (input: {
  priceLevel?: number;
  placeTypes?: string[];
  locale?: Locale;
}): string | null => {
  const locale = input.locale ?? getLocale();
  const level = formatSpendLevel(input.priceLevel, locale);
  if (level) return `${l("一般消费：", "Typical spend: ", locale)}${level}`;

  // If it's clearly a dining/shopping place but price level is missing, give a gentle hint.
  const t = new Set((input.placeTypes || []).map((x) => String(x)));
  const looksLikeConsumption =
    t.has("restaurant") ||
    t.has("cafe") ||
    t.has("bar") ||
    t.has("shopping_mall") ||
    t.has("department_store") ||
    t.has("bakery");

  return looksLikeConsumption
    ? l(
        "一般消费：未提供（可参考菜单/点评）",
        "Typical spend: not provided (check menu/reviews)",
        locale,
      )
    : null;
};

const looksLikeTicketedAttraction = (types?: string[]): boolean => {
  const t = new Set((types || []).map((x) => String(x)));
  return (
    t.has("tourist_attraction") ||
    t.has("museum") ||
    t.has("art_gallery") ||
    t.has("amusement_park") ||
    t.has("aquarium") ||
    t.has("zoo") ||
    t.has("theme_park") ||
    t.has("stadium")
  );
};

const looksLikeClearlyTicketedByTypes = (types?: string[]): boolean => {
  const t = new Set((types || []).map((x) => String(x)));
  // These are almost always ticketed or have paid exhibits/decks.
  return (
    t.has("amusement_park") ||
    t.has("theme_park") ||
    t.has("aquarium") ||
    t.has("zoo") ||
    t.has("movie_theater") ||
    t.has("stadium") ||
    t.has("museum")
  );
};

const looksLikeClearlyTicketedByName = (name?: string): boolean => {
  const n = (name || "").toLowerCase();
  if (!n) return false;

  // Towers / observatories / decks (Tokyo Tower, Tokyo Skytree, etc.)
  const towerLike =
    n.includes("tower") ||
    n.includes("skytree") ||
    n.includes("observatory") ||
    n.includes("observation deck") ||
    n.includes("viewing deck") ||
    n.includes("sky deck") ||
    n.includes("展望台") ||
    n.includes("观景台") ||
    n.includes("觀景台") ||
    n.includes("塔") ||
    n.includes("タワー") ||
    n.includes("スカイツリー");

  // Theme parks / attractions
  const attractionLike =
    n.includes("theme park") ||
    n.includes("amusement") ||
    n.includes("aquarium") ||
    n.includes("zoo") ||
    n.includes("museum") ||
    n.includes("美术馆") ||
    n.includes("美術館") ||
    n.includes("博物馆") ||
    n.includes("博物館");

  return towerLike || attractionLike;
};

const looksLikeUsuallyFree = (types?: string[]): boolean => {
  const t = new Set((types || []).map((x) => String(x)));
  return (
    t.has("park") ||
    t.has("place_of_worship") ||
    t.has("church") ||
    t.has("hindu_temple") ||
    t.has("mosque") ||
    t.has("synagogue")
  );
};

export const formatTicketSummary = (input: {
  price?: number;
  tag?: string;
  type?: string;
  name?: string;
  placeTypes?: string[];
  locale?: Locale;
}): string | null => {
  const locale = input.locale ?? getLocale();
  const isCustom = (input.tag || "").toLowerCase() === "custom";

  // If we have an explicit numeric ticket estimate, show it.
  if (typeof input.price === "number" && Number.isFinite(input.price)) {
    if (input.price > 0)
      return `${l("门票：约 ", "Tickets: ~ ", locale)}${Math.round(
        input.price,
      )}${l("（参考）", " (estimate)", locale)}`;
    // Treat zero as "free" only for non-custom curated places.
    if (input.price === 0 && !isCustom)
      return l("门票：免费", "Tickets: free", locale);
  }

  if (looksLikeUsuallyFree(input.placeTypes)) {
    return isCustom
      ? l("门票：通常免费/随缘捐赠", "Tickets: usually free / donation", locale)
      : l("门票：免费", "Tickets: free", locale);
  }

  if (
    looksLikeClearlyTicketedByTypes(input.placeTypes) ||
    looksLikeClearlyTicketedByName(input.name)
  ) {
    return l(
      "门票：需要（建议提前购票）",
      "Tickets: required (book ahead recommended)",
      locale,
    );
  }

  if (looksLikeTicketedAttraction(input.placeTypes)) {
    return l(
      "门票：可能需要（建议查官网/现场）",
      "Tickets: may be required (check official site/on-site)",
      locale,
    );
  }

  return null;
};
