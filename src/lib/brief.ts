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
  "Celebrity Campaigns":
    "Cultural-moment amplification via named celebrities and ambassadors. High reach potential but must clear the India-relevance and luxury-adaptability filters.",
  "Exclusive Brand Launches":
    "New brand, collection or drop launches — treated as cultural events, not product drops. Typically 2–3 a month.",
  "Lifestyle / Occasion Styling":
    "Occasion-dressing, gifting and styling narratives. Seasonal, aspirational, high save intent.",
  "Sale / Promotion Announcements":
    "Access-and-desire messaging only. Never urgency-led. Follow the C.L.I.U. doctrine.",
  "Product Catalogue Posts":
    "Category and product spotlights — watches, fine jewellery, bags, luxury beauty. Consideration-driving.",
  "UGC / Influencer Collaborations":
    "Tastemaker, connoisseur and customer-led storytelling. Depth and authenticity over virality.",
  "Craftsmanship / Brand Stories":
    "Behind-the-maison craft, heritage and brand-world building. Core to our editorial register — longer watch time, high save-intent.",
  "Pre-Owned Luxury Stories":
    "Certified pre-owned and vintage — provenance, rarity and circularity narratives.",
  "Cultural / Seasonal Moments":
    "Fashion weeks, cultural festivals, red-carpet moments, and India cultural calendar plays.",
};

/**
 * Keyword lexicon for auto-classification. Order matters: earlier buckets win
 * ties so that specific intents (Launches, Sale) beat broad ones (Product).
 */
export const BUCKET_KEYWORDS: { bucket: string; terms: string[] }[] = [
  { bucket: "Sale / Promotion Announcements", terms: ["sale", "big cliq", "cliu", "end of season", "eoss", "offer", "big luxe", "% off", "discount"] },
  { bucket: "Exclusive Brand Launches", terms: ["launch", "launching", "now on tata", "now live", "introducing", "new on", "drops", "arrives", "debut", "unveil", "exclusive"] },
  { bucket: "Pre-Owned Luxury Stories", terms: ["pre-owned", "preowned", "pre owned", "certified", "vintage", "luxe generations", "second life", "renewed"] },
  { bucket: "Craftsmanship / Brand Stories", terms: ["craft", "craftsmanship", "artisan", "atelier", "handmade", "heritage", "savoir", "maison", "how it's made", "behind the", "world of", "iconic", "legacy", "the house of", "journey"] },
  { bucket: "Cultural / Seasonal Moments", terms: ["diwali", "valentine", "raksha", "eid", "holi", "navratri", "durga puja", "christmas", "new year", "monsoon", "fashion week", "couture week", "cannes", "met gala", "watches and wonders", "wedding season"] },
  { bucket: "Celebrity Campaigns", terms: ["celeb", "celebrity", "spotted", "wore", "red carpet", "airport", "nick jonas", "priyanka", "deepika", "ambassador", "brand ambassador", "muse"] },
  { bucket: "UGC / Influencer Collaborations", terms: ["influencer", "creator", "prachi", "rochelle", "nonita", "collab", "in conversation", "grwm", "with @", "ft.", "feat", "@", "customer", "ugc"] },
  { bucket: "Lifestyle / Occasion Styling", terms: ["gift", "gifting", "wedding", "bridal", "festive", "occasion", "anniversary", "mother's day", "father's day", "lifestyle", "day in", "routine", "vibe", "aesthetic", "moodboard", "styling", "style", "how to", "5 ways", "ways to"] },
  { bucket: "Product Catalogue Posts", terms: ["watch", "jewellery", "jewelry", "bag", "handbag", "sneaker", "fragrance", "perfume", "beauty", "lipstick", "sunglasses", "kolhapuri", "jhumka", "saree", "dial", "diamond", "gold", "collection"] },
];
