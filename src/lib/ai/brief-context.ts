/**
 * Distilled Tata CLiQ Luxury context, cached as a server-side constant.
 *
 * WHY A CONSTANT: this never changes between requests, so we keep it in code and
 * inject it server-side. The browser never sends it — that's the "cache the parsed
 * brief so it isn't sent repeatedly" requirement, achieved with zero re-transmission.
 *
 * Distilled from TCL_Luxury_Social_AI_Context_Brief. Keep it tight to stay token-cheap.
 */
export const TCL_BRIEF_CONTEXT = `
BRAND: Tata CLiQ Luxury (TCL). Tagline "Savour the Best of Life." Positioning: "We are not a marketplace. We are a maison." Instagram is the primary platform and editorial hub — luxury demands the RIGHT presence, not omnipresence. Quality over quantity: every post must earn its place.

VOICE: Elegant and aspirational without being boring. India-relevant and luxury-adaptable. Restraint over reach. Never UGC-grade; always editorial. Off-limits: competitor call-outs, pricing/discount claims, unverifiable provenance/category claims.

DEPTH KPIs (privileged over raw reach): Saves, Shares, Watch Time, Profile Visits, Follower quality. A save/share is worth more than an impression.

TONE-OF-VOICE REFERENCES (not competitors): Jacquemus (playful, art-directed, surreal CGI, meme-literate yet luxury), Hermès, Loewe (deadpan "how-to" humour on luxury objects), Miu Miu, Bottega Veneta (tongue-in-cheek everyday-luxury storytelling).

COMPETITIVE / BENCHMARK SET (Indian): The Collective, Ajio Luxe, Myntra Luxe, Nykaa Fashion/Luxe, Aza Fashion, Pernia's Pop-Up Shop (cultural depth + curatorial voice), SSENSE (avant-garde, intellectual).

REFERENCE FEEDS TO SCAN: Business of Fashion (BoF), Vogue (India/global), ELLE, Harper's Bazaar, InStyle; marketing pages Pretty Little Marketing (global) and Sorted Digital (India). Indian tastemakers/creators: Prachi Raniwala, Rochelle Pinto, Nonita Kalra.

FAVOURED FORMATS: Cinematic Reels (editorial quality, never UGC), text-forward editorial carousels, behind-the-maison craft storytelling, interactive Stories, AI/CGI product campaigns.

CONTENT BUCKETS: Celebrity, Product, Lifestyle, Editorial, Brand Story, Craftsmanship, Launch, Campaign, Influencer, Sale, Pre-Owned, Occasion.

CALENDAR METHOD (in order): 1) Site & business alignment (launches, category pushes, drops, tentpole sales); 2) Topical & cultural moments of the month (deliberate, not exhaustive); 3) Live India-relevant trend analysis across fashion, culture, luxury, beauty. Conversations can be global but must land for Indian audiences (e.g. fashion weeks, FIFA, the film "Odyssey", India Couture Week Delhi).

CULTURAL SIGNAL SOURCES: cultural moments (celebrity, viral entertainment), category/product trends (a jewellery/watch/beauty category surging), creator trends (what connoisseurs are doing), any major fashion week or viral celebrity styling moment relevant to India — adapt, don't just report; translate into a shoppable, editorial, TCL-voiced moment.

SALE DOCTRINE (C.L.I.U.): Luxury markdowns communicate access and desire, never urgency. Sale = access, not panic. Turn commerce into episodic, cinematic storytelling.
`.trim();
