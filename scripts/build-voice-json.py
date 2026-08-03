import json, re
from collections import Counter

sample = json.loads(open("/tmp/voice-sample.json").read())

def clean(s: str) -> str:
    s = s.strip()
    s = re.sub(r"\s+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s

# Pick the strongest brand-voice exemplars: high engagement + non-empty caption
# Prefer variety: mix of reels, carousels/sidecars, videos
top_reels = [r for r in sample if r["kind"] == "Reel"][:15]
top_sidecar = [r for r in sample if r["kind"] == "Sidecar"][:12]
top_video = [r for r in sample if r["kind"] == "Video"][:8]
top_image = [r for r in sample if r["kind"] not in ("Reel","Sidecar","Video")][:5]

exemplars = top_reels + top_sidecar + top_video + top_image
# cap each caption/transcript to ~600 chars for prompt budget
compact = []
for r in exemplars[:35]:
    cap = clean(r["caption"])[:700]
    trs = clean(r["transcript"])[:500] if r["transcript"] else ""
    compact.append({
        "kind": r["kind"],
        "caption": cap,
        "transcript": trs,
        "hashtags": r["hashtags"][:4],
        "brands": r["tagged"][:6],
        "likes": r["likes"],
    })

# Also count most-tagged brands from full sample for the "canonical brand list from actual account" 
brand_counter = Counter()
for r in sample:
    for b in r["tagged"]:
        brand_counter[b] += 1
top_brands = [b for b, _ in brand_counter.most_common(40)]

out = {
    "exemplars": compact,
    "topTaggedBrands": top_brands,
}
open("/tmp/brand-voice-data.json", "w").write(json.dumps(out, ensure_ascii=False, indent=2))
print(f"Wrote {len(compact)} exemplars, {len(top_brands)} tagged brands")
print(f"Sample size chars: {len(json.dumps(compact))}")

# print top brands so we can also use them for the catalog
print("\nTop tagged brands:")
for b in top_brands[:25]:
    print(f"  {b}")
