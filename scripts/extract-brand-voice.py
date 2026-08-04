import pandas as pd
import json
from pathlib import Path

files = [
    "/mnt/user-data/uploads/dataset_instagram-post-scraper_2026-08-03_06-54-54-819.xlsx",
    "/mnt/user-data/uploads/dataset_instagram-reel-scraper_2026-08-03_06-16-19-578.xlsx",
    "/mnt/user-data/uploads/dataset_instagram-reel-scraper_2026-08-03_06-31-15-400.xlsx",
]

rows = []
for f in files:
    df = pd.read_excel(f)
    is_reel = "transcript" in df.columns
    for _, r in df.iterrows():
        caption = str(r.get("caption", "") or "").strip()
        if not caption or caption == "nan":
            continue
        transcript = ""
        if is_reel and pd.notna(r.get("transcript")):
            transcript = str(r["transcript"]).strip()
        first_comment = str(r.get("firstComment", "") or "").strip() if "firstComment" in df.columns else ""
        if first_comment == "nan": first_comment = ""

        # Collect tagged brand usernames (first 6 taggedUsers if reel, or sponsors + coauthors)
        tagged = []
        for i in range(10):
            for prefix in [f"taggedUsers/{i}/username", f"coauthorProducers/{i}/username", f"sponsors/{i}/username"]:
                if prefix in df.columns:
                    v = r.get(prefix)
                    if pd.notna(v) and str(v).strip() and str(v).strip() != "tatacliqluxury":
                        tagged.append(str(v).strip())

        hashtags = []
        for i in range(5):
            k = f"hashtags/{i}"
            if k in df.columns:
                v = r.get(k)
                if pd.notna(v) and str(v).strip():
                    hashtags.append(str(v).strip())

        likes = r.get("likesCount", 0)
        comments = r.get("commentsCount", 0)
        views = r.get("videoPlayCount") if "videoPlayCount" in df.columns else None
        try: likes = int(likes) if pd.notna(likes) else 0
        except: likes = 0
        try: comments = int(comments) if pd.notna(comments) else 0
        except: comments = 0
        try: views = int(views) if views is not None and pd.notna(views) else None
        except: views = None

        rows.append({
            "kind": "Reel" if is_reel else str(r.get("type", "Post")),
            "shortCode": r.get("shortCode", ""),
            "caption": caption,
            "transcript": transcript,
            "firstComment": first_comment,
            "hashtags": hashtags,
            "tagged": list(dict.fromkeys(tagged)),  # dedupe preserve order
            "likes": likes,
            "comments": comments,
            "views": views,
            "timestamp": str(r.get("timestamp", "")),
        })

# Dedupe by shortCode
seen = set()
uniq = []
for r in rows:
    if r["shortCode"] in seen: continue
    seen.add(r["shortCode"]); uniq.append(r)
rows = uniq

print(f"Total unique posts: {len(rows)}")
# Sort by likes desc and take top 40
rows.sort(key=lambda x: (x["likes"], x["comments"]), reverse=True)
top = rows[:40]
# Also take a random sample from remaining for variety
import random
random.seed(1)
mid = random.sample(rows[40:min(140, len(rows))], min(20, max(0, len(rows) - 40)))
sample = top + mid
print(f"Sample size: {len(sample)}")

# Save to json for inspection
Path("/tmp/voice-sample.json").write_text(json.dumps(sample, indent=2, default=str))
print("Written /tmp/voice-sample.json")

# Show 3 captions to eyeball voice
for i, r in enumerate(sample[:5]):
    print(f"\n--- SAMPLE {i+1} ({r['kind']}, {r['likes']} likes) ---")
    print(f"CAPTION: {r['caption'][:400]}")
    if r["transcript"]:
        print(f"TRANSCRIPT: {r['transcript'][:400]}")
    if r["tagged"]:
        print(f"TAGGED: {', '.join(r['tagged'][:8])}")
