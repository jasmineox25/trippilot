type PlaceTipsInput = {
  name?: string;
  loc?: string;
  type?: string;
  placeTypes?: string[];
  openingHours?: { openNow?: boolean };
  priceLevel?: number;
};

import { getLocale } from "../i18n/i18n";

const uniq = (items: string[]) => Array.from(new Set(items));

const normalizeTypes = (types?: string[]) =>
  (types || []).map((t) => String(t).toLowerCase());

const hasAnyType = (types: string[], candidates: string[]) =>
  candidates.some((c) => types.includes(c));

const nameHas = (name: string, keywords: string[]) => {
  const lower = name.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
};

const locHas = (loc: string, keywords: string[]) => {
  const lower = loc.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
};

const getLocaleFlags = (name: string, loc: string, types: string[]) => {
  const combined = `${name} ${loc}`.toLowerCase();
  const inSydney = locHas(combined, [
    "sydney",
    "nsw",
    "new south wales",
    "australia",
  ]);
  const inLondon = locHas(combined, [
    "london",
    "uk",
    "united kingdom",
    "england",
  ]);
  const inJapan = locHas(combined, [
    "japan",
    "tokyo",
    "kyoto",
    "osaka",
    "nara",
  ]);

  const isTransitNode = hasAnyType(types, [
    "train_station",
    "subway_station",
    "transit_station",
    "bus_station",
    "light_rail_station",
    "ferry_terminal",
  ]);

  return { inSydney, inLondon, inJapan, isTransitNode };
};

export const getPlaceTips = (input: PlaceTipsInput): string[] => {
  const tips: string[] = [];
  const locale = getLocale();
  const isZh = locale === "zh";
  const isJa = locale === "ja";
  const pick = (zh: string, en: string, ja?: string) =>
    isZh ? zh : isJa ? ja || en : en;

  const types = normalizeTypes(input.placeTypes);
  const name = input.name || "";
  const loc = input.loc || "";
  const { inSydney, inLondon, inJapan, isTransitNode } = getLocaleFlags(
    name,
    loc,
    types,
  );

  const isFree =
    typeof input.priceLevel === "number" && Math.round(input.priceLevel) === 0;

  // Ticket / reservation
  // Skip if we know it's free
  if (
    !isFree &&
    (hasAnyType(types, [
      "museum",
      "art_gallery",
      "amusement_park",
      "zoo",
      "aquarium",
      "movie_theater",
      "stadium",
    ]) ||
      nameHas(name, ["ticket", "museum", "skytree", "tower", "observatory"]))
  ) {
    tips.push(
      pick(
        "建议提前线上买票/预约时段，并截图保存二维码或订单号（热门时可能售罄/排长队）",
        "Book tickets / reserve a time slot in advance when possible, and save a screenshot of the QR code or booking reference (popular times may sell out or have long lines).",
        "可能なら事前にチケット購入/時間指定予約をして、QRコードや予約番号をスクショ保存（人気の時間帯は売り切れたり行列になることがあります）。",
      ),
    );
  }

  // Transit / tap on-off (beginner friendly)
  if (isTransitNode) {
    tips.push(
      pick(
        "乘车前确认线路/站台/出口；很多城市需要“上车/进站刷一次、下车/出站再刷一次”，否则可能多扣费",
        "Confirm the line/platform/exit before boarding. In many cities you must tap in and tap out; otherwise you may be overcharged.",
        "乗車前に路線・ホーム・出口を確認。多くの都市では入場/乗車時と出場/降車時の両方でタップが必要で、しないと高額になることがあります。",
      ),
    );
    tips.push(
      pick(
        "建议准备交通卡或手机/银行卡支付，减少排队购票时间",
        "Use a transit card or tap-to-pay (phone/bank card) to avoid queueing for tickets.",
        "交通系ICやタッチ決済（スマホ/クレカ）を用意すると券売機の行列を避けられます。",
      ),
    );
  }

  // Locale-specific transit tips (useful even if user doesn't search a station)
  if (inSydney) {
    tips.push(
      pick(
        "悉尼/NSW 公共交通常用 Opal 或银行卡：上车(进站)刷卡后，下车(出站)也要再刷一次（Tap on + Tap off）",
        "In Sydney/NSW, public transit commonly uses Opal or a bank card: tap on when you enter and tap off when you exit.",
        "シドニー/NSWはOpalやクレカが一般的：入るときにタップ、出るときにもタップ（Tap on + Tap off）。",
      ),
    );
  }
  if (inLondon) {
    tips.push(
      pick(
        "伦敦地铁/火车多用 Oyster 或银行卡：进站刷卡、出站也要刷卡（Tap in + Tap out）",
        "In London, the Tube/rail often uses Oyster or a bank card: tap in and tap out.",
        "ロンドンはOysterやクレカ：入場時にタップ、退出時にもタップ（Tap in + Tap out）。",
      ),
    );
  }
  if (inJapan) {
    tips.push(
      pick(
        "日本轨道交通常用 Suica/PASMO 等 IC 卡：进站刷卡、出站也要刷卡；换乘时留意站台与出口",
        "In Japan, rail transit commonly uses IC cards like Suica/PASMO: tap in and tap out, and pay attention to platforms and exits when transferring.",
        "日本の鉄道はSuica/PASMOなどICカード：入場/退出でタップ。乗換の際はホームと出口に注意。",
      ),
    );
  }

  // Airport
  if (hasAnyType(types, ["airport"])) {
    tips.push(
      pick(
        "机场建议提前到达：国内≥2小时 / 国际≥3小时；提前在线值机并确认航站楼与登机口",
        "Arrive early at the airport: domestic ≥ 2 hours / international ≥ 3 hours. Check in online when possible and confirm your terminal and gate.",
        "空港は早めに：国内は2時間以上／国際は3時間以上。可能ならオンラインチェックインし、ターミナルとゲートを確認。",
      ),
    );
  }

  // Food
  if (hasAnyType(types, ["restaurant", "cafe", "bar"])) {
    tips.push(
      pick(
        "餐厅高峰可能排队：可先预约/线上取号；到店后确认是否需要等位短信或取号单",
        "Restaurants can have lines at peak times. Consider booking or joining the queue online; on arrival, confirm whether you need an SMS or a ticket number to wait.",
        "混雑時は行列のことも。予約/オンライン受付を検討し、到着後にSMSや番号札が必要か確認。",
      ),
    );
  }

  // Outdoor
  if (hasAnyType(types, ["park", "beach", "natural_feature"])) {
    tips.push(
      pick(
        "户外行程建议穿舒适鞋；根据天气准备雨具/防晒/保暖，并留意日落时间与返程交通",
        "Wear comfortable shoes for outdoor plans. Bring rain/sun/cold protection as needed, and keep an eye on sunset time and return transport.",
        "屋外は歩きやすい靴で。天候に合わせて雨具/日焼け/防寒、日没時刻と帰りの交通も確認。",
      ),
    );
  }

  // Opening hours hint
  if (input.openingHours && input.openingHours.openNow === false) {
    tips.push(
      pick(
        "当前可能未营业：出发前再核对开放时间/最后入场时间（部分景点提前停止入场）",
        "It may be closed right now. Recheck opening hours and last entry time before you go (some attractions stop entry early).",
        "今は営業時間外かも。出発前に営業時間と最終入場を再確認（早めに入場終了する施設もあります）。",
      ),
    );
  }

  // Generic crowding hint for attractions
  if (hasAnyType(types, ["tourist_attraction", "point_of_interest"])) {
    tips.push(
      pick(
        "热门地点建议错峰（早到/工作日）；预留排队时间（如有安检也要预留），并确认是否允许携带大件行李",
        "For popular spots, go off-peak (early / weekdays). Budget time for lines (and possible security checks), and check whether large luggage is allowed.",
        "人気スポットは早朝/平日が狙い目。行列（施設によってはセキュリティチェック）も見込み、大きな荷物の可否も確認。",
      ),
    );
  }

  const out = uniq(tips);
  return out.slice(0, 4);
};

export const formatTipsSummary = (
  tips?: string[],
  opts?: { maxItems?: number; locale?: string },
): string | null => {
  if (!tips || tips.length === 0) return null;
  const maxItems = Math.max(1, opts?.maxItems ?? 2);
  const locale = opts?.locale ?? getLocale();
  const isZh = locale === "zh";
  const separator = isZh ? "；" : "; ";
  const ellipsis = isZh ? "…" : "...";
  const shown = tips.slice(0, maxItems);
  const more = tips.length - shown.length;
  const base = shown.join(separator);
  return more > 0 ? `${base}${ellipsis}` : base;
};
