# AccidentLogic — Suggested SEO & Content Changes

This file lists recommended fixes for the staging site. Page content was ported
**verbatim** from the live accidentlogic.com per direction; the items below are
the changes I suggest making before the production push. The structured audit
data lives in [`seo-audit.xlsx`](seo-audit.xlsx); this doc is the prose/edit
version with concrete diffs and writer-facing notes.

Severity legend: 🔴 must-fix • 🟡 should-fix • 🟢 nice-to-have

---

## Site-wide

### 🔴 Replace boilerplate references to other brands in legal pages
The privacy/CCPA copy was clearly cloned from another site. The text references
**"Email Agency", "emailagency.com", "californiawildfireclaim.org",
"info@emailagency.com"** and similar. Search/replace before launch:

| Find | Replace with |
|---|---|
| `Email Agency` | `AccidentLogic` |
| `emailagency.com` | `accidentlogic.com` |
| `info@emailagency.com` | `info@lawlogic.com` |
| `californiawildfireclaim.org` | `accidentlogic.com` |
| `californiawildfireclaim` | `accidentlogic` |

Affected files:
- [`src/content/privacy-policy.njk`](src/content/privacy-policy.njk)
- [`src/content/ccpa-policy.njk`](src/content/ccpa-policy.njk)
- [`src/content/ccpa.njk`](src/content/ccpa.njk)
- [`src/content/terms-conditions.njk`](src/content/terms-conditions.njk)

### 🔴 Have a lawyer review legal pages before production
Privacy, Terms, and CCPA were inherited from another site. Even after the
brand rename above, jurisdictional language, third-party data references, and
contact addresses should be reviewed by counsel for accuracy under
California/state law.

### 🟡 Add Open Graph + Twitter Card meta on every page
None of the live pages have `og:image`, `og:title`, or Twitter card meta. Add
defaults in [`src/layouts/base.njk`](src/layouts/base.njk):
- `og:title` (use the `{% block title %}` value)
- `og:description` (use the description block)
- `og:image` — needs a 1200×630 social card; doesn't yet exist
- `og:type` = `website`
- `twitter:card` = `summary_large_image`

Suggested follow-up: design a generic OG card (e.g. brand mark + tagline + url
on a navy background) and place at `/images/og/default.png`.

### 🟡 Add a favicon set
No favicon yet. Need at minimum: `favicon.ico`, `apple-touch-icon.png` (180×180),
and a `manifest.json`. `build.js` already copies a `favicon.ico` from the project
root if one exists.

### 🟡 Add `BreadcrumbList` schema to interior pages
Improves SERP appearance. One JSON-LD block per service/legal page that lists
home → page-title.

### 🟢 Switch the hero video to a smaller WebM
[`images/home/hero-bg.mp4`](images/home/hero-bg.mp4) is 1.2 MB. A 720p WebM
re-encode usually drops to ~400 KB at the same visual quality. Add a `<source>`
for WebM with the MP4 as fallback.

### 🟢 Image optimization pass
All service and hero images were copied directly from WordPress uploads. Run
through `cwebp` / `sharp` to produce WebP variants and reduce file size. The
service icons (~30–80 KB PNGs) would shrink ~70% as WebP.

---

## Page-specific

### `/` (homepage)
- 🟢 Hero video has no audio/captions — fine for a silent loop. Add `aria-hidden="true"` on the `<video>` since it's purely decorative.
- 🟢 Final CTA section button text "Start Your Claim" duplicates the hero CTA — consider replacing with "Get a free case review" for variety.

### `/rideshare-accidents` (and other service pages)
- 🟡 Live `meta description` was 165–184 chars (truncates in SERPs). Already shortened in [`src/data/services.json`](src/data/services.json) — verify wording.
- 🟡 No service-page hero image. Consider adding the `*-hero.jpg` already downloaded into `images/services/` to the service-page hero (currently solid navy background).
- 🟡 Add an `FAQPage` JSON-LD block per service page with 3–5 common questions. High SERP-real-estate impact.

### `/privacy-policy`
- 🔴 See site-wide brand find/replace above.
- 🟡 Add a "Last updated" line (currently shows "Effective Date: 08/25/24").
- 🟡 Document our actual third-party data sharing partners (currently lists generic ones from the source site).

### `/terms-conditions`
- 🔴 References the placeholder brand — see find/replace.
- 🟡 Add a clear arbitration / dispute-resolution clause if not present.

### `/ccpa-policy`
- 🔴 Heavy "californiawildfireclaim" / "Email Agency" references.
- 🟡 Update the contact email to `info@lawlogic.com`.
- 🟡 Consider linking from this page to `/ccpa` (the request form) explicitly.

### `/ccpa`
- 🔴 Body copy still says "californiawildfireclaim website" — must change.
- 🟡 The form is a placeholder. Wire up to a real backend (Formspree / custom endpoint) before launch.
- 🟢 Add `aria-required="true"` and explicit error messages for accessibility.

### `/opt-out`
- 🟡 Page is intentionally minimal (the live site only had a form widget). Confirm the heading "We're Sorry to See You Go" is on-brand; some users prefer the more neutral "Opt-Out Request".
- 🟡 The form is currently the standard `/form.min.js` lead form — confirm that's the right submission target for opt-outs, or wire up a separate handler.

### `/thank-you`, `/cm-thank-you`, `/thank-you-int`
- 🟡 All three have near-identical copy. Differentiate the messaging slightly so attribution/funnel reporting can tell them apart in analytics.
- 🟢 Add a `<meta name="robots" content="noindex">` *override* per-page once the site is indexable, since transactional thank-you pages should not appear in search. (They're noindexed site-wide while staging.)
- ✅ `/thank-you-int` is already wired to `forceDefaultOn` in `phone-config.js` so it always shows the brand default phone, regardless of first-touch attribution.

### `/sa-test`
- ✅ Dropped from the new build per direction.

---

## Tracking & analytics (deferred)

The base layout supports a GTM container ID in [`src/data/site.json`](src/data/site.json) (`gtmId`). It is currently empty. When ready:
1. Create the GTM container.
2. Set `site.gtmId` to the suffix (e.g. for `GTM-ABCD123`, use `ABCD123`).
3. Configure GA4, conversion events on `/thank-you*` pages.

---

## Pre-production launch checklist

When ready to push to `accidentlogic.com` (production):

1. ☐ Apply all 🔴 items above (brand replacement, legal review).
2. ☐ Set `site.indexable: true` in `src/data/site.json` and remove the
   `<meta name="robots" content="noindex, nofollow">` from `base.njk`.
3. ☐ Replace `robots.txt` with allow-all + production sitemap URL.
4. ☐ Remove the `Header set X-Robots-Tag` block from `.htaccess`.
5. ☐ Remove the `X-Robots-Tag` line from `server.js` (dev only).
6. ☐ Set production GTM ID in `src/data/site.json`.
7. ☐ Verify all canonical URLs use `https://accidentlogic.com/...` (already
    handled by `site.productionUrl`).
8. ☐ Run a final crawl pass with the audit script and confirm no new issues.
9. ☐ Update sitemap.xml `lastmod` dates and submit to Search Console.
10. ☐ Confirm `info@lawlogic.com` mailbox is live and monitored.
