import { IMAGES } from "./constants";

export interface Place {
  id: string;
  name: string;
  loc: string;
  lat?: number;
  lng?: number;
  rating: number;
  img: string;
  tag: string;
  type: string;
  /**
   * Human-facing POI category (e.g. 历史古迹/地标建筑/博物馆/美术馆...).
   * Used primarily for Gemini recommendations.
   */
  category?: string;
  placeTypes?: string[];
  openingHours?: {
    openNow?: boolean;
    weekdayText?: string[];
  };
  tips?: string[];
  // Curated places may include a rough ticket estimate; for user-searched places this is usually unknown.
  price?: number;
  // Google Places legacy `price_level` (0..4) when available.
  priceLevel?: number;
  description?: string;
}

// REAL Google Place IDs for better routing accuracy
export const ALL_PLACES: Place[] = [
  {
    id: "ChIJ82aW8OQIAWARxYyD6iWvXco",
    name: "Kinkaku-ji",
    loc: "Kyoto, Japan",
    lat: 35.0394,
    lng: 135.7292,
    rating: 4.8,
    img: IMAGES.KYOTO_KINKAKU,
    tag: "Landmark",
    type: "Historic • 1h",
    price: 4,
  },
  {
    id: "ChIJ3xkyZ6UIAWARv2zY3vJ8zQs",
    name: "Ryoan-ji",
    loc: "Kyoto, Japan",
    lat: 35.0345,
    lng: 135.7182,
    rating: 4.6,
    img: IMAGES.KYOTO_RYOANJI,
    tag: "Zen Garden",
    type: "Culture • 1h",
    price: 5,
  },
  {
    id: "ChIHzR5l-K4IAWARuYt9ybsCqA0",
    name: "Arashiyama Bamboo Grove",
    loc: "Kyoto, Japan",
    lat: 35.0169,
    lng: 135.6713,
    rating: 4.7,
    img: IMAGES.KYOTO_ARASHIYAMA,
    tag: "Nature",
    type: "Nature • 2h",
    price: 0,
  },
  {
    id: "ChIJ8Ti3m_MIAWARt94gz1ji2_U",
    name: "Fushimi Inari Taisha",
    loc: "Kyoto, Japan",
    lat: 34.9671,
    lng: 135.7727,
    rating: 4.9,
    img: IMAGES.MAP_VIEW_THUMB,
    tag: "Shrine",
    type: "Hiking • 2h",
    price: 0,
  },
  {
    id: "ChIJ35oi0WIIAWARl7i3tK2eE1g",
    name: "Kiyomizu-dera",
    loc: "Kyoto, Japan",
    lat: 34.9949,
    lng: 135.785,
    rating: 4.8,
    img: IMAGES.MAP_VIEW_THUMB,
    tag: "Temple",
    type: "Historic • 2h",
    price: 3,
  },
  {
    id: "ChIJt4lJ1r0WIWARu9fT3yFk7aE",
    name: "Nara Park",
    loc: "Nara, Japan",
    lat: 34.685,
    lng: 135.843,
    rating: 4.7,
    img: IMAGES.MAP_VIEW_THUMB,
    tag: "Nature",
    type: "Park • 2h",
    price: 0,
  },
  {
    id: "ChIJz4rRj3ngAGAR1uS_u9QW_V4",
    name: "Osaka Castle",
    loc: "Osaka, Japan",
    lat: 34.6873,
    lng: 135.5262,
    rating: 4.6,
    img: IMAGES.MAP_VIEW_THUMB,
    tag: "History",
    type: "Castle • 2h",
    price: 6,
  },
  {
    id: "ChIJgxb5L7akGGARvWjR8wzV88g",
    name: "Tokyo Tower",
    loc: "Tokyo, Japan",
    lat: 35.6586,
    lng: 139.7454,
    rating: 4.5,
    img: IMAGES.MAP_VIEW_THUMB,
    tag: "Landmark",
    type: "View • 1h",
    price: 10,
  },
  {
    id: "ChIJ8Ttq1f2GGGARivCjM8VjAQU",
    name: "Senso-ji",
    loc: "Tokyo, Japan",
    lat: 35.7148,
    lng: 139.7967,
    rating: 4.7,
    img: IMAGES.MAP_VIEW_THUMB,
    tag: "Temple",
    type: "Culture • 1h",
    price: 0,
  },
];
