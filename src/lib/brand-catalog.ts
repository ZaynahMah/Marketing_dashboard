/**
 * Master brand catalog for Tata CLiQ Luxury.
 *
 * ⚠️ EDITABLE — this is the seed list. When the official brand list arrives,
 * replace `BRAND_CATALOG` entirely. Every AI-generated content idea will name
 * only brands from this list. Categories map brands to the sections used by
 * the Ideas generator, so grouping stays coherent.
 *
 * Structure kept intentionally minimal so replacement is a one-file change.
 */

export type BrandCategory =
  | "Fashion & Ready-to-Wear"
  | "Handbags & Leather"
  | "Watches"
  | "Fine Jewellery"
  | "Footwear"
  | "Beauty & Fragrance"
  | "Eyewear"
  | "Travel & Luggage"
  | "Home & Lifestyle"
  | "Indian Couture";

export interface BrandEntry {
  name: string;
  category: BrandCategory;
  /** Short note the AI can weave into ideas — heritage, register, signature. */
  register?: string;
}

export const BRAND_CATALOG: BrandEntry[] = [
  // Fashion & RTW
  { name: "Emporio Armani", category: "Fashion & Ready-to-Wear", register: "Italian tailoring, understated modern" },
  { name: "Versace", category: "Fashion & Ready-to-Wear", register: "Baroque maximalism, Medusa iconography" },
  { name: "Diesel", category: "Fashion & Ready-to-Wear", register: "Denim-forward, subversive luxury" },
  { name: "Canali", category: "Fashion & Ready-to-Wear", register: "Milanese sartorial heritage" },
  { name: "Ted Baker", category: "Fashion & Ready-to-Wear", register: "British contemporary, playful prints" },

  // Bags & Leather
  { name: "Coach", category: "Handbags & Leather", register: "New York leather craft" },
  { name: "Michael Kors", category: "Handbags & Leather", register: "American accessible luxury" },
  { name: "Kate Spade New York", category: "Handbags & Leather", register: "Feminine polish, colour play" },
  { name: "Furla", category: "Handbags & Leather", register: "Italian leather elegance" },

  // Watches
  { name: "TAG Heuer", category: "Watches", register: "Motorsport lineage, Carrera & Monaco" },
  { name: "Longines", category: "Watches", register: "Elegance & tradition since 1832" },
  { name: "Rado", category: "Watches", register: "Material innovation, ceramic pioneer" },
  { name: "Tissot", category: "Watches", register: "Swiss precision, accessible entry point" },
  { name: "Emporio Armani Watches", category: "Watches", register: "Fashion-house watchmaking" },
  { name: "Michael Kors Watches", category: "Watches", register: "Statement dials, jet-set register" },

  // Fine Jewellery
  { name: "Swarovski", category: "Fine Jewellery", register: "Precision-cut crystal maison" },
  { name: "Zoya (Tata)", category: "Fine Jewellery", register: "Diamond storytelling, women's world" },
  { name: "Tanishq", category: "Fine Jewellery", register: "Indian gold heritage" },

  // Footwear
  { name: "Jimmy Choo", category: "Footwear", register: "Red-carpet couture footwear" },
  { name: "Salvatore Ferragamo", category: "Footwear", register: "Italian shoemaking legacy" },
  { name: "Aldo", category: "Footwear", register: "Contemporary accessible footwear" },

  // Beauty & Fragrance
  { name: "Jo Malone London", category: "Beauty & Fragrance", register: "Layered scent, English restraint" },
  { name: "Estée Lauder", category: "Beauty & Fragrance", register: "American beauty heritage" },
  { name: "Clinique", category: "Beauty & Fragrance", register: "Dermatologist-led skincare" },
  { name: "MAC Cosmetics", category: "Beauty & Fragrance", register: "Editorial makeup, artist tools" },
  { name: "Bobbi Brown", category: "Beauty & Fragrance", register: "Skin-first makeup philosophy" },
  { name: "Tom Ford Beauty", category: "Beauty & Fragrance", register: "Sensual luxury, statement scent" },
  { name: "Versace Fragrances", category: "Beauty & Fragrance" },
  { name: "Emporio Armani Fragrances", category: "Beauty & Fragrance" },

  // Eyewear
  { name: "Ray-Ban", category: "Eyewear", register: "Aviator, Wayfarer — cultural icons" },
  { name: "Oakley", category: "Eyewear", register: "Sport-performance eyewear" },
  { name: "Persol", category: "Eyewear", register: "Italian handcrafted eyewear" },

  // Travel & Luggage
  { name: "Tumi", category: "Travel & Luggage", register: "Executive travel, ballistic nylon" },
  { name: "Samsonite Black Label", category: "Travel & Luggage" },

  // Home & Lifestyle
  { name: "Villeroy & Boch", category: "Home & Lifestyle", register: "German tableware heritage" },
  { name: "Wedgwood", category: "Home & Lifestyle", register: "Fine bone china since 1759" },

  // Indian Couture
  { name: "Anita Dongre", category: "Indian Couture", register: "Sustainable Indian couture" },
  { name: "Tarun Tahiliani", category: "Indian Couture", register: "India Modern couture" },
  { name: "Rohit Bal", category: "Indian Couture", register: "Kashmiri-inspired opulence" },
];

export function brandsByCategory(category: BrandCategory): BrandEntry[] {
  return BRAND_CATALOG.filter((b) => b.category === category);
}

export function brandNames(): string[] {
  return BRAND_CATALOG.map((b) => b.name);
}

/**
 * A compact summary the AI receives so it can reference brands accurately
 * without us shipping the entire lexicon in every request.
 */
export function catalogForPrompt(): string {
  const by: Partial<Record<BrandCategory, string[]>> = {};
  for (const b of BRAND_CATALOG) {
    (by[b.category] ??= []).push(b.name);
  }
  return Object.entries(by)
    .map(([cat, names]) => `${cat}: ${names!.join(", ")}`)
    .join(" | ");
}
