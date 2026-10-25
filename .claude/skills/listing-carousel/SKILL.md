---
name: listing-carousel
description: Turn a folder of listing photos plus the listing facts into a branded 5-slide Instagram/Facebook carousel (1080x1350 PNGs) for a real estate team. Use when asked for a listing carousel, listing post slides, or "make a post for this listing". Draft only, never posts.
---

# Listing carousel

Input: a listing folder containing `photos/` and the listing facts (a `listing.md`, pasted MLS text, or what the user says).
Output: `output/slide_1.png` … `slide_5.png` and `output/preview.png`, inside that listing folder.

## Steps

1. **Read the brand.** Load `brand/<team>.json` from this skill folder (Mount LeConte → `mount-leconte.json`). Follow its `voice` rules for every word you write.
2. **Read the facts.** Pull the address, unit, town, beds/baths, standout features, and listing agent. Never make up a feature. If something isn't in the facts or clearly visible in a photo, leave it out.
3. **Look at every photo.** Pick five slides in this order:
   1. Hero exterior, or the best overall shot
   2. Main living space
   3. View or outdoor space
   4. Amenity or a standout feature
   5. Closing slide. Reuse the hero, or use another strong exterior.
   Skip photos that are dark, blurry, or crooked, or that show people or personal items.
4. **Write the copy** for each slide:
   - eyebrow: 2–4 words
   - headline: under 8 words
   - sub: one plain sentence that only says what the photo shows
   For the closing slide, use the brand's `closing` headline and button, with the listing agent's name.
   Fair housing: describe the property, never who should live there ("perfect for families" and similar are out).
5. **Write `slides.json`**. Photos are landscape and slides are tall, so each one gets cropped to its middle. If what the headline mentions is off to one side (a fireplace, a view), add `"focus": "20% center"` to that slide. Use 0% for the left edge and 100% for the right. Save it in the listing folder:
   ```json
   {
     "brand": "mount-leconte",
     "footer": "410 Big Bear Way • Unit 3002",
     "slides": [
       { "photo": "photos/001.jpg", "eyebrow": "...", "headline": "...", "sub": "..." },
       { "photo": "photos/014.jpg", "focus": "25% center", "eyebrow": "...", "headline": "...", "sub": "..." },
       { "photo": "photos/001.jpg", "eyebrow": "...", "headline": "...", "sub": "...", "button": "..." }
     ]
   }
   ```
6. **Render:** `node <this skill folder>/render.js <listing folder>/slides.json`
7. **Check your work.** Open `output/preview.png`, then each slide. Make sure the text is readable, nothing is cut off, and the photo isn't badly cropped. Fix `slides.json` and re-render if needed.
8. **Hand off.** Show the preview and list the five headlines so the agent can approve or change them. Say it's a draft for them to post.

## Alternate style: "A day at…"

A 7-slide story (cover, five times of day, closing recap) with a serif display font and a timeline across the top.
Use it when the agent asks for something more creative, or the listing sells a lifestyle (cabins, rentals).

- Plan: `day.json` in the listing folder. See `demo`-style example at `listings/honey-bear-lodge/day.json`.
  Each moment has `label`, `time` ("8:00 AM"), `mood` (morning, midday, evening, dusk, night), `photo`, optional `focus`, `headline`, `sub`.
- Pick moments that match real photos and real features only. Same fair-housing and voice rules as above.
- Render: `node <this skill folder>/render-day.js <listing folder>/day.json` → `output-day/`.
- Check the cover title is readable and no headline wraps onto a single orphan word.
