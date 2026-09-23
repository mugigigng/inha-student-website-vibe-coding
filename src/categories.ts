// Dependency-free so the web frontend can import it without pulling in AI/DB code.
export const CATEGORIES = ['장학금', '학사', '모집/선발', '행사/특강', '취업/진로', '국제교류', '시설/생활', '기타'] as const;
export type Category = (typeof CATEGORIES)[number];
