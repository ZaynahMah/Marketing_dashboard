/**
 * TCL LUXURY CONTEXT — encoded from the Social Media AI Context & Operating Brief.
 * Every recommendation, planner entry and audit line references these constants
 * so output reads as Tata CLiQ Luxury, never generic social-media advice.
 */

export const TCL = {
  tagline: "Savour the Best of Life.",
  positioning: "We are not a marketplace. We are a maison.",
  principles: [
    "Voice is non-negotiable — elegant and aspirational without being boring.",
    "Everything must be India-relevant and luxury-adaptable.",
    "Restraint over reach — depth of engagement over breadth.",
    "Quality over quantity — every post must earn its place on the feed.",
  ],
  // Depth-of-engagement metrics the brief explicitly privileges over raw reach.
  luxuryKPIs: ["Saves", "Shares", "Watch Time", "Profile Visits", "Follower quality"],
  toneReferences: ["Jacquemus", "Hermès", "Loewe", "Miu Miu", "Bottega Veneta"],
  competitors: ["The Collective", "Ajio Luxe", "Myntra Luxe", "Nykaa Luxe", "Aza Fashion", "Pernia's Pop-Up Shop"],
  favouredFormats: [
    "Cinematic Reels (editorial quality, never UGC)",
    "Text-forward editorial carousels",
    "Behind-the-maison craft storytelling",
    "Interactive Stories",
    "AI / CGI product campaigns",
  ],
  // The C.L.I.U. sale doctrine: access & desire, never urgency.
  saleDoctrine:
    "Luxury markdowns communicate access and desire, never urgency. Sale = access, not panic. Reference the C.L.I.U. model: turn commerce into episodic, cinematic storytelling.",
  // Section 6 calendar method — business → topical → live trend, in that order.
  calendarMethod: [
    "Site & business alignment (launches, category pushes, drops, tentpole sales)",
    "Topical & cultural moments of the month (deliberate, not exhaustive)",
    "Live India-relevant trend analysis (fashion, culture, luxury, beauty)",
  ],
} as const;

/**
 * Content-bucket doctrine. Each bucket carries how the brief wants it treated,
 * so recommendations can cite brand intent alongside the numbers.
 */
export const BUCKET_DOCTRINE: Record<string, string> = {
  Craftsmanship:
    "Behind-the-maison craft narratives sit at the core of our register — heritage, artisan access, longer considered watch time.",
  Editorial:
    "Text-forward POV pieces, trend intelligence and curation rationale. Our maison's editorial voice.",
  Celebrity:
    "Cultural-moment amplification. High reach but must clear the India-relevance + luxury-adaptability filter.",
  Influencer:
    "Tastemaker and connoisseur led (Prachi Raniwala, Rochelle Pinto, Nonita Kalra register). Depth over virality.",
  Launch: "New brand / collection launches — treated as cultural events, not product drops. 2–3 a month.",
  Occasion: "Occasion-dressing and gifting intelligence — seasonal, collector-led, high save intent.",
  Lifestyle: "Product-in-context storytelling, creator-first, aspirational but engaging.",
  Product: "Category and product spotlights — watches, fine jewellery, luxury beauty.",
  "Brand Story": "Maison storytelling and brand-world building. Equity over conversion.",
  Campaign: "Tentpole and mini campaigns designed for organic + creator + paid simultaneously.",
  Sale: "Access-and-desire messaging only. Never urgency. Follow the C.L.I.U. doctrine.",
  "Pre-Owned": "Certified pre-owned / vintage luxury — provenance and rarity storytelling.",
};

/**
 * Keyword lexicon for auto-classification. Order matters: earlier buckets win
 * ties so that specific intents (Launch, Sale) beat broad ones (Product).
 * Tuned to TCL vocabulary from the brief and typical post descriptions.
 */
export const BUCKET_KEYWORDS: { bucket: string; terms: string[] }[] = [
  { bucket: "Sale", terms: ["sale", "big cliq", "cliu", "end of season", "eoss", "offer", "big luxe"] },
  { bucket: "Launch", terms: ["launch", "launching", "now on tata", "now live", "introducing", "new on", "drops", "arrives", "debut", "unveil"] },
  { bucket: "Pre-Owned", terms: ["pre-owned", "preowned", "pre owned", "certified", "vintage", "luxe generations"] },
  { bucket: "Craftsmanship", terms: ["craft", "craftsmanship", "artisan", "atelier", "handmade", "heritage", "savoir", "maison", "made", "how it's made", "behind the"] },
  { bucket: "Occasion", terms: ["gift", "gifting", "wedding", "bridal", "festive", "diwali", "valentine", "occasion", "monsoon", "raksha", "anniversary", "mother's day", "father's day"] },
  { bucket: "Celebrity", terms: ["celeb", "celebrity", "spotted", "wore", "red carpet", "met gala", "cannes", "airport", "nick jonas", "ambassador"] },
  { bucket: "Influencer", terms: ["influencer", "creator", "prachi", "rochelle", "nonita", "collab", "in conversation", "grwm", "with @", "ft.", "feat"] },
  { bucket: "Editorial", terms: ["edit", "editorial", "how to", "guide", "trend", "5 ways", "ways to", "styling", "style", "pov", "decoded", "explained", "report", "checklist"] },
  { bucket: "Campaign", terms: ["campaign", "series", "presenting", "chapter", "episode", "the watch society", "indiluxe"] },
  { bucket: "Brand Story", terms: ["story", "world of", "iconic", "legacy", "the house of", "journey"] },
  { bucket: "Product", terms: ["watch", "jewellery", "jewelry", "bag", "handbag", "sneaker", "fragrance", "perfume", "beauty", "lipstick", "sunglasses", "kolhapuri", "jhumka", "saree", "dial", "diamond", "gold"] },
  { bucket: "Lifestyle", terms: ["lifestyle", "day in", "routine", "vibe", "aesthetic", "moodboard", "in the city", "at home", "travel"] },
];
