# Genetik Bleu Salon Website

This project now uses the real Genetik Bleu Salon logo, the owner photo, and salon hairstyle photography supplied for the site.

## Files

- `index.html` — Home page
- `services.html` — Dedicated service menu
- `registration.html` — Client registration page
- `styles.css` — Shared styling for all pages
- `script.js` — Mobile navigation, slideshow, and automatic footer year
- `images/` — Real salon logo, owner portrait, slideshow images, and service images

## Real images already connected

The home page uses:
- `images/genetik-bleu-logo.jpeg`
- `images/owner-marni-newman.jpeg`
- Four real salon photos in the rotating slideshow

The services page also uses real client hairstyle photography on selected service cards. Some service cards intentionally have no photo, because the service menu was designed to support both formats.

## Owner caption

The owner portrait is labeled in small text:

`Salon owner and Stylist Marni Newman`

## Classes

The site includes:

`Classes are Sunday and Monday. Please call during shop hours for more information.`

Regular shop hours remain Tuesday–Saturday, 10:00 AM–6:00 PM.

## IMPORTANT: sample service pricing

The prices in `services.html` are temporary sample prices for the website mockup. Replace them with final salon pricing before publishing.

## Instagram

The Instagram buttons are already styled, but the real Instagram profile URL has not been supplied yet.

Search the HTML files for the comment:

`INSTAGRAM LINK`

Then replace the `#` in that button's `href="#"` with the full Genetik Bleu Instagram URL.

## Booking link

The booking buttons are also placeholders until the salon's real booking URL is supplied.

## Client registration form

The registration form is front-end only right now. It does not save or send client data until connected to a form provider, booking platform, or backend.

## Preview the site

The easiest method in Visual Studio Code:

1. Open this project folder.
2. Install the **Live Server** extension.
3. Right-click `index.html`.
4. Choose **Open with Live Server**.

All main HTML, CSS, and JavaScript files contain detailed comments explaining what each major section does and where to make future edits.

## Photo display notes

- The salon owner photo and service-menu photos use their original edge-to-edge presentation.
- Only the homepage slideshow uses the zoomed-out treatment.
- Slideshow photos sit over a blurred copy of the same image so more of each hairstyle remains visible without harsh black bars.
- The blue-hair homepage hero remains full-bleed and has a slightly taller desktop frame to show more of the hairstyle without creating borders.


## August 2026 gallery + compact services update

- The homepage slideshow was replaced with an 8-photo static gallery.
- An example gallery `<figure>` block is commented out in `index.html` so more photos can be added later.
- The Services page uses a compact three-column menu on desktop to reduce scrolling.
- The Services photo showcase uses the remaining unique salon photos; desktop hover enlarges each photo without pushing the page downward.
- The large “Questions Before Booking?” section was removed from the Services page.
- The top-right “Call Salon” button was replaced with a normal **Contact** navigation link that jumps to the footer.
- Four of the later supplied salon uploads were exact duplicate files of earlier photos, so identical duplicates are not repeated as separate gallery tiles.
- `firebase-config.js` is filled with the Genetik Bleu Salon Firebase Web configuration supplied during setup.


## Latest design updates

- Services are back to combined photo + service description cards, but in a denser grid.
- Service and home-gallery photos can be enlarged. On desktop, hover enlarges; on phones/tablets, tap opens a full-screen viewer.
- The Services footer logo is forced to preserve its natural aspect ratio.
- The Registration page has a left-side rotating review panel and the form label “Lets grow together.”
- The review carousel currently uses short public Google-review excerpts that mention Marni; add other verified 4- or 5-star reviews manually if desired.
- Mobile layouts were tightened for iPhone-sized screens, including two-column compact service cards where space allows.


## August 20 refinements
- Cuts/Styling and Color are combined into one compact service section.
- Desktop service-photo hover now stacks above neighboring cards correctly.
- Registration review carousel uses a transparent, page-blended design with black text.
- Review carousel includes selected Google and Yelp reviews supplied for the site.

## Salon policies page

- `policies.html` contains the salon policies in a compact View/Close accordion.
- The Policies page is intentionally linked only from the footer of each page.
- Policy accordion behavior is in `script.js`, and the visual styling is in `styles.css`.
- The Marnstarr star position can be adjusted in `styles.css` under `.marnstarr-star`; comments there explain how to move it up/down/left/right.


## Latest visual adjustments

- The gold Marnstarr star is anchored to the word with absolute positioning so it cannot wrap below the word.
- Desktop star offset is 1cm right + 1cm down. See `.marnstarr-star` in `styles.css` for commented controls.
- All photographed service cards now default to `--image-y: 38%` so more hair is visible. Individual images can still override `--image-y` directly in `services.html`.


## Latest additions
- Added photographed Silk Press and Color Retouch services.
- Replaced the old appointment banner with a Sunday/Monday education feature.
- Added a required client-list + automated communications consent checkbox to registration.
- Updated Firestore rules to record marketing consent and a server timestamp.
- Replaced the former Hair Care block with a compact four-step “What to Expect” client journey.
- Added commented templates in index.html and services.html for adding future photos/services.

IMPORTANT: Because firestore.rules changed, publish the updated rules in Firebase before testing the revised registration form.

## Latest polish update
- Homepage gallery intro no longer says "Eight".
- Client registration intro copy was simplified for clients.
- Added the supplied Joi Jones 5-star Google review to the curated review carousel.
- All current service prices are preserved in `services.html` but commented out so they are hidden from visitors until final pricing is ready.

## Welcoming editorial personality upgrade

This version adds a warmer, more Marni-focused presentation without changing the site's core content structure:

- Stronger signature blue accent (`--marni-blue`) and a small gold Marnstarr accent.
- Gentle reveal-on-scroll motion. Visitors who prefer reduced motion automatically get a static version.
- A redesigned Marnstarr Experience feature with a short healthy-hair/style mantra.
- A more editorial desktop `Styles By Marni` photo grid; phone/tablet keeps the clean two-column gallery.
- A stronger `Come Learn with Us!` classes feature with class-focus tags.
- More inviting client review styling on the registration page.
- Subtle hover/underline movement for navigation, buttons, cards, and photos.
- A fixed phone/tablet quick-contact bar for `Call Marni` and `Instagram`.

### Instagram quick-contact behavior

The footer Instagram URL is still a placeholder (`href="#"`). Until the real Instagram URL is added, the mobile/tablet `Instagram` quick-contact button scrolls to the Contact footer instead of opening a broken link. Once the real Instagram URL is placed in the existing footer `.instagram-button`, `script.js` automatically uses that URL in the quick-contact bar too.

### Editing the new accent colors

Search `styles.css` (and `services-first-site.css` for the Services page) for:

```css
--marni-blue
--marni-blue-deep
--marnstarr-gold
```

Those variables control most of the new personality accents.

## Client-preview finishing effects

The site includes a restrained final polish layer for the client preview:
- staggered hero text entrance on the Home page;
- scroll-reveal motion for galleries/cards;
- a desktop-only `Explore` scroll cue in the hero;
- smooth anchor scrolling with sticky-header offsets;
- a one-time Marnstarr star shimmer/rotation;
- very subtle paper/grain texture in selected cream sections;
- existing button hover shine/lift and mobile/tablet quick-contact bar.

All motion respects the visitor's `prefers-reduced-motion` accessibility setting.
The `Explore` cue is intentionally hidden on tablets and phones so the approved mobile portrait composition stays clean.


## Mobile/tablet Classes + Contact navigation fix
The shared `script.js` intentionally intercepts same-page hash links such as `#classes` and `#contact`. It closes the hamburger menu first and only then scrolls to the target. Do not remove that block unless the mobile navigation is redesigned. The home/gallery images also include explicit `width` and `height` attributes to reserve layout space and keep cross-page anchors accurate while images load.

## Instagram
Marni's current Instagram is connected to every `Follow on Instagram` button and the mobile/tablet quick-contact bar:
`https://www.instagram.com/marnstarr_marni?igsi=MXY0YXpjMGZjZnUxOQ==`

## Private salon dashboard (Firebase Phase 2)

`admin.html` is the private Client + Appointment Manager. It is intentionally not linked from the public navigation. Access is controlled by Google Authentication plus Firestore `admins/{uid}` authorization. See `FIREBASE_SETUP.md` for the exact setup sequence.
