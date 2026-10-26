---
name: listing-carousel
description: Turn listing photos plus the listing facts into a branded 5-slide Instagram/Facebook carousel (1080x1350 PNGs) for a real estate agent or team. Use when asked for a listing carousel, a carousel post, listing post slides, or "make a post for this listing". Draft only, never posts.
---

# Listing carousel

Input: listing photos (uploaded, or from a listing page you can open) plus the listing facts (pasted MLS text, a listing link, or what the agent tells you).
Output: five 1080x1350 PNG slides and a preview sheet, ready to download and post.

## Steps

1. **Brand and voice.** If the agent has a brand voice skill, follow it for every word. Use their team name and colors if you know them; otherwise ask once for the team name and use navy `#0E1A2B` with gold `#D4A84B`.
2. **Facts.** Pull the address, town, beds/baths, size, standout features and listing agent from what you were given. Never make up a feature. If something isn't in the facts or clearly visible in a photo, leave it out. If a listing link won't open, ask for the photos and the description instead.
3. **Pick five photos**, in this order:
   1. Best exterior or overall shot
   2. Main living space
   3. View or outdoor space
   4. An amenity or standout feature
   5. Closing slide: reuse the first photo or another strong exterior

   Skip photos that are dark, blurry or crooked, or that show people or personal items.
4. **Write the copy** for each slide:
   - eyebrow: 2–4 words
   - headline: short enough to read in a second
   - sub: one plain sentence that says only what the photo shows

   Closing slide: headline "Want a closer look?", the agent's name, brokerage and phone as the sub, and a button such as "Ask [first name] for details".
   Fair housing: describe the property, never who should live there ("perfect for families" and similar are out).
5. **Write `slides.json`** next to the photos:
   ```json
   {
     "brand": {"team": "Team Name", "ink": "#0E1A2B", "accent": "#D4A84B"},
     "footer": "123 Main St • Unit 4",
     "slides": [
       {"photo": "photos/front.jpg", "eyebrow": "...", "headline": "...", "sub": "..."},
       {"photo": "photos/living.jpg", "focus": 0.25, "eyebrow": "...", "headline": "...", "sub": "..."},
       {"photo": "photos/front.jpg", "eyebrow": "...", "headline": "...", "sub": "...", "button": "..."}
     ]
   }
   ```
   Photos are landscape and slides are tall, so each photo is cropped. `focus` picks what stays in frame: 0 keeps the left edge, 1 keeps the right, 0.5 (the default) keeps the middle. Use it when what the headline mentions is off to one side, like a fireplace or a view.
6. **Render:** `python <this skill's folder>/render.py <folder with slides.json>/slides.json`. It needs only Pillow (`pip install pillow` if missing).
7. **Check your work.** Look at `output/preview.png`, then each slide. Make sure the text is readable, nothing is cut off, and the photo still shows what the headline talks about. Fix `slides.json` and render again if needed.
8. **Hand off.** Give the agent the five slides as downloadable files and list the five headlines so they can approve or change them. Say it's a draft for them to review and post themselves.
