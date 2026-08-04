import json

data = json.loads(open("/tmp/brand-voice-data.json").read())

# Build a TS file with the exemplars as a string constant (JSON.stringify-friendly)
# Keep it small enough to fit comfortably in the prompt.
ts_out = ['// AUTO-GENERATED from actual @tatacliqluxury post/reel captions & transcripts.',
          '// Source: 261 unique posts scraped 2026-08-03. This is the "brand voice" ground truth',
          '// injected into every content-generation prompt so recommendations sound like TCL',
          '// rather than a generic AI. Update by re-running scripts/extract-brand-voice.py.',
          '',
          '/** Real caption/transcript exemplars from the account, chosen for engagement + variety. */',
          'export const TCL_VOICE_EXEMPLARS = ' + json.dumps(data["exemplars"], ensure_ascii=False, indent=2) + ' as const;',
          '',
          '/** Brand handles the account actively tags (creators + partner brands). */',
          'export const TCL_ACTIVE_TAGGED_HANDLES: readonly string[] = ' + json.dumps(data["topTaggedBrands"], ensure_ascii=False, indent=2) + ';',
          '',
          '/** Compact voice guide extracted from patterns across the exemplars. */',
          'export const TCL_VOICE_GUIDE = `']

# Distill a voice guide from what I saw
guide = """VOICE OF @tatacliqluxury (learned from the exemplars — obey these):

TONE
- Editorial, warm, aspirational. First-person plural where appropriate ("Here's how we celebrated…").
- Never breathless. Never salesy. No adjective stacking ("stunning, breathtaking, must-have").
- Confidence, not urgency. Sentences are short and end clean.

STRUCTURE
- Opens with a poetic 1-line hook, often paired with a period ("Easy mornings. Unplanned evenings.").
- 1-2 sentence body building the story.
- One ✨ or a single elegant symbol per caption — never more.
- Brand credit block at the end: "Outfit: @brand · Watch: @brand · Bag: @brand" — clean labels, one item per line.
- Utility close: "Explore on Tata CLiQ Luxury." / "Link in bio." / "Shop now on tatacliqluxury.com"
- Optional parenthetical keyword drop at very end: "(Tata CLiQ Luxury, Spring Summer 2026, LuxuryFashion)"

HASHTAGS
- Sparing. #ThisJustIn, #LuxuryInHerEveryday, brand campaign hashtags. Never a wall.

REELS (from transcripts)
- Open with a real spoken line — usually a question or observation ("Hey Ashwika, what are you wearing today?", "I need to know what's there for the 2026 spring summer collection.")
- Conversational, warm delivery. Names casts by name.
- Ends with a soft product/brand cue, not a hard sell.

BRAND-CREDIT DISCIPLINE
- Always @-mention the brand handles the account actually tags (see TCL_ACTIVE_TAGGED_HANDLES).
- Never invent brand handles. Never write "luxury brands" generically when a real handle exists.

WHAT TCL NEVER SOUNDS LIKE
- "Elevate your wardrobe." "Curated for you." "The ultimate luxury experience." "Shop the look now!"
- Emoji spam (🔥💯👑). All-caps. "OMG". "Guys". "You need this."
- Hard-sell CTAs. Countdown timers.
- Any claim that treats the audience as passive shoppers rather than tastemakers.

WHEN WRITING A RECOMMENDATION CAPTION
- 40-90 words for a Reel caption. 60-120 for a Carousel/Static.
- Follow the exact 4-block structure: (1) opening hook line, (2) 1-2 sentence body, (3) brand credits block, (4) close + optional bracket keywords.
- Match the register in the exemplars — read them before drafting.
"""

ts_out.append(guide.replace('`', '\\`').replace('${', '\\${'))
ts_out.append('`;')
ts_out.append('')

# Also expose a compact prompt fragment builder
ts_out.append('/**')
ts_out.append(' * Compact prompt fragment: 8-12 exemplar captions + the voice guide.')
ts_out.append(' * Used inside every content-generation prompt so the model writes in-voice.')
ts_out.append(' */')
ts_out.append('export function tclVoicePromptFragment(maxExemplars = 10): string {')
ts_out.append('  const picks = TCL_VOICE_EXEMPLARS.slice(0, maxExemplars);')
ts_out.append('  const lines = picks.map((e, i) => {')
ts_out.append('    const brands = e.brands.length ? `\\n  Tagged brands: ${e.brands.join(", ")}` : "";')
ts_out.append('    const trs = e.transcript ? `\\n  Reel transcript: ${e.transcript}` : "";')
ts_out.append('    return `[Exemplar ${i + 1} · ${e.kind} · ${e.likes.toLocaleString("en-IN")} likes]\\n  Caption: ${e.caption}${trs}${brands}`;')
ts_out.append('  });')
ts_out.append('  return `${TCL_VOICE_GUIDE}\\n\\n=== REAL TCL POST EXEMPLARS (read all before drafting) ===\\n${lines.join("\\n\\n")}`;')
ts_out.append('}')

open("/tmp/brand-voice.ts", "w").write("\n".join(ts_out))
print("wrote /tmp/brand-voice.ts")
import os
print(f"size: {os.path.getsize('/tmp/brand-voice.ts')} bytes")
