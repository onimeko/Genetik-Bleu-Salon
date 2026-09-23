/* =============================================================
   GENETIK BLEU SALON - SHARED JAVASCRIPT
   =============================================================
   Handles:
   1. Mobile navigation
   2. Automatic copyright year
   3. Tap/click full-screen photo viewer (home + services)
   4. Registration-page review slideshow
   5. Salon-policy accordion
   ============================================================= */

const menuButton = document.querySelector(".menu-toggle");
const mainNavigation = document.querySelector(".main-nav");

if (menuButton && mainNavigation) {
  menuButton.addEventListener("click", () => {
    const menuIsOpen = mainNavigation.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(menuIsOpen));
  });

  mainNavigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNavigation.classList.remove("is-open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

/* =============================================================
   RELIABLE SECTION NAVIGATION (MOBILE / TABLET / DESKTOP)
   =============================================================
   Why this exists:
   On phones and tablets, tapping Classes or Contact while the hamburger menu
   was open could scroll using the menu's EXPANDED height. When the menu then
   collapsed, the target section shifted and visitors landed too early.

   Cross-page links such as services.html -> index.html#classes could also land
   early if photos above the target finished sizing after the browser performed
   its first automatic hash jump.

   This helper closes the menu first, waits for the final layout, then performs
   the section scroll. Image width/height attributes in the HTML also reserve
   photo space before loading, which prevents large gallery layout shifts.
   ============================================================= */
function closeMobileNavigation() {
  if (!mainNavigation || !menuButton) return;
  mainNavigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
}

function scrollToSectionHash(hash, behavior = "smooth") {
  if (!hash || hash === "#") return false;
  const target = document.querySelector(hash);
  if (!target) return false;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({
    behavior: reducedMotion ? "auto" : behavior,
    block: "start"
  });
  return true;
}

/* Same-page hash links: collapse the hamburger menu BEFORE calculating the
   target position. This fixes the "tap Classes/Contact twice" mobile bug. */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  const hash = link.getAttribute("href");
  if (!hash || hash === "#" || !document.querySelector(hash)) return;

  link.addEventListener("click", (event) => {
    event.preventDefault();
    closeMobileNavigation();

    if (window.location.hash !== hash) {
      history.pushState(null, "", hash);
    }

    /* Two animation frames guarantee the menu has collapsed and the browser
       has completed the resulting reflow before we measure the target. */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSectionHash(hash));
    });
  });
});

/* Cross-page hashes: once Home is fully loaded, correct the browser's initial
   anchor position one more time. This is especially important on iPhone/iPad. */
function correctInitialHashPosition() {
  const hash = window.location.hash;
  if (!hash || !document.querySelector(hash)) return;
  closeMobileNavigation();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollToSectionHash(hash, "auto"));
  });
}

window.addEventListener("load", () => {
  correctInitialHashPosition();
  /* A short second pass handles late font/image sizing in mobile browsers. */
  window.setTimeout(correctInitialHashPosition, 180);
});

if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    if (window.location.hash) correctInitialHashPosition();
  });
}

const currentYear = document.querySelector("#current-year");
if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

/* =============================================================
   PHOTO LIGHTBOX
   =============================================================
   Any image with data-zoomable can be enlarged.

   COLOR RETOUCH SPECIAL CASE:
   If the enlarged image belongs to a [data-service-slider], the lightbox
   also shows Previous / Next arrows. Those arrows remain available while
   the photo is enlarged, so visitors can view BOTH Color Retouch photos
   without closing the lightbox. Swipe and keyboard arrows work too.
   ============================================================= */
function getServiceSliderData(slider) {
  if (!slider) return null;
  const image = slider.querySelector('[data-slider-image]');
  const counter = slider.querySelector('[data-slider-count]');
  const images = (slider.dataset.images || '').split('|').filter(Boolean);
  const alts = (slider.dataset.alts || '').split('|');
  if (!image || !images.length) return null;
  return { image, counter, images, alts };
}

function setServiceSliderIndex(slider, requestedIndex) {
  const data = getServiceSliderData(slider);
  if (!data) return null;

  const total = data.images.length;
  const index = ((requestedIndex % total) + total) % total;
  slider.dataset.currentIndex = String(index);
  data.image.src = data.images[index];
  data.image.alt = data.alts[index] || 'Color Retouch hairstyle by Marni';
  if (data.counter) data.counter.textContent = (index + 1) + ' / ' + total;

  return { ...data, index };
}

const zoomableImages = document.querySelectorAll('img[data-zoomable]');

if (zoomableImages.length) {
  const lightbox = document.createElement('div');
  lightbox.className = 'photo-lightbox';
  lightbox.setAttribute('aria-hidden', 'true');
  lightbox.innerHTML =     '<button class="photo-lightbox-close" type="button" aria-label="Close enlarged photo">×</button>' +
    '<button class="photo-lightbox-nav photo-lightbox-prev" type="button" aria-label="Previous photo" hidden>‹</button>' +
    '<img class="photo-lightbox-image" alt="" />' +
    '<button class="photo-lightbox-nav photo-lightbox-next" type="button" aria-label="Next photo" hidden>›</button>' +
    '<span class="photo-lightbox-count" aria-live="polite" hidden></span>' +
    '<p class="photo-lightbox-caption"></p>';
  document.body.appendChild(lightbox);

  const lightboxImage = lightbox.querySelector('.photo-lightbox-image');
  const lightboxCaption = lightbox.querySelector('.photo-lightbox-caption');
  const closeButton = lightbox.querySelector('.photo-lightbox-close');
  const previousButton = lightbox.querySelector('.photo-lightbox-prev');
  const nextButton = lightbox.querySelector('.photo-lightbox-next');
  const lightboxCount = lightbox.querySelector('.photo-lightbox-count');

  let activeSlider = null;
  let lightboxTouchStartX = null;

  function updateLightboxFromSlider() {
    if (!activeSlider) return;
    const data = getServiceSliderData(activeSlider);
    if (!data) return;

    const index = Number(activeSlider.dataset.currentIndex || 0);
    lightboxImage.src = data.images[index];
    lightboxImage.alt = data.alts[index] || 'Color Retouch hairstyle by Marni';
    lightboxCaption.textContent = lightboxImage.alt;
    lightboxCount.textContent = (index + 1) + ' / ' + data.images.length;
  }

  function changeLightboxSlider(direction) {
    if (!activeSlider) return;
    const currentIndex = Number(activeSlider.dataset.currentIndex || 0);
    setServiceSliderIndex(activeSlider, currentIndex + direction);
    updateLightboxFromSlider();
  }

  function openLightbox(image) {
    activeSlider = image.closest('[data-service-slider]');

    if (activeSlider) {
      const initialIndex = Number(activeSlider.dataset.currentIndex || 0);
      setServiceSliderIndex(activeSlider, initialIndex);
      updateLightboxFromSlider();
      previousButton.hidden = false;
      nextButton.hidden = false;
      lightboxCount.hidden = false;
    } else {
      lightboxImage.src = image.currentSrc || image.src;
      lightboxImage.alt = image.alt || 'Enlarged salon hairstyle';
      lightboxCaption.textContent = image.closest('figure')?.querySelector('figcaption')?.textContent || image.alt || '';
      previousButton.hidden = true;
      nextButton.hidden = true;
      lightboxCount.hidden = true;
    }

    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    closeButton.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    activeSlider = null;
  }

  zoomableImages.forEach((image) => {
    image.setAttribute('role', 'button');
    image.setAttribute('aria-label', (image.alt || 'Salon hairstyle') + '. Tap or click to enlarge.');
    image.addEventListener('click', () => openLightbox(image));
    image.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(image);
      }
    });
  });

  previousButton.addEventListener('click', (event) => {
    event.stopPropagation();
    changeLightboxSlider(-1);
  });

  nextButton.addEventListener('click', (event) => {
    event.stopPropagation();
    changeLightboxSlider(1);
  });

  lightboxImage.addEventListener('touchstart', (event) => {
    if (!activeSlider) return;
    lightboxTouchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  lightboxImage.addEventListener('touchend', (event) => {
    if (!activeSlider || lightboxTouchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? lightboxTouchStartX;
    const distance = touchEndX - lightboxTouchStartX;
    lightboxTouchStartX = null;
    if (Math.abs(distance) < 45) return;
    changeLightboxSlider(distance > 0 ? -1 : 1);
  }, { passive: true });

  closeButton.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (activeSlider && event.key === 'ArrowLeft') changeLightboxSlider(-1);
    if (activeSlider && event.key === 'ArrowRight') changeLightboxSlider(1);
  });
}

/* =============================================================
   REGISTRATION PAGE REVIEW SLIDESHOW
   ============================================================= */
const reviewCarousel = document.querySelector("[data-review-carousel]");

if (reviewCarousel) {
  const slides = Array.from(reviewCarousel.querySelectorAll(".review-slide"));
  const previousButton = reviewCarousel.querySelector("[data-review-prev]");
  const nextButton = reviewCarousel.querySelector("[data-review-next]");
  const dotsContainer = reviewCarousel.querySelector("[data-review-dots]");
  const reviewTrack = reviewCarousel.querySelector(".review-track");
  let currentIndex = 0;
  let timer;

  const dots = slides.map((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "review-dot";
    dot.setAttribute("aria-label",       'Show review ' + (index + 1)
    );
    if (index === 0) dot.classList.add("is-active");
    dot.addEventListener("click", () => {
      showReview(index);
      restartReviewTimer();
    });
    dotsContainer?.appendChild(dot);
    return dot;
  });

  function setReviewTrackHeight() {
    if (!reviewTrack || !slides.length) return;

    let tallestSlide = 0;

    slides.forEach((slide) => {
      const previousPosition = slide.style.position;
      const previousInset = slide.style.inset;
      const previousVisibility = slide.style.visibility;
      const previousOpacity = slide.style.opacity;
      const previousPointerEvents = slide.style.pointerEvents;
      const previousTransform = slide.style.transform;

      slide.style.position = "relative";
      slide.style.inset = "auto";
      slide.style.visibility = "hidden";
      slide.style.opacity = "1";
      slide.style.pointerEvents = "none";
      slide.style.transform = "none";

      tallestSlide = Math.max(tallestSlide, slide.offsetHeight);

      slide.style.position = previousPosition;
      slide.style.inset = previousInset;
      slide.style.visibility = previousVisibility;
      slide.style.opacity = previousOpacity;
      slide.style.pointerEvents = previousPointerEvents;
      slide.style.transform = previousTransform;
    });

    if (tallestSlide > 0) {
      reviewTrack.style.minHeight = tallestSlide + 'px';
    }
  }

  function showReview(index) {
    if (!slides.length) return;
    currentIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === currentIndex;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      dots[slideIndex]?.classList.toggle("is-active", active);
    });
  }

  function startReviewTimer() {
    if (slides.length > 1) timer = window.setInterval(() => showReview(currentIndex + 1), 6500);
  }

  function restartReviewTimer() {
    window.clearInterval(timer);
    startReviewTimer();
  }

  previousButton?.addEventListener("click", () => {
    showReview(currentIndex - 1);
    restartReviewTimer();
  });
  nextButton?.addEventListener("click", () => {
    showReview(currentIndex + 1);
    restartReviewTimer();
  });

  reviewCarousel.addEventListener("mouseenter", () => window.clearInterval(timer));
  reviewCarousel.addEventListener("mouseleave", startReviewTimer);

  window.addEventListener("load", setReviewTrackHeight);
  window.addEventListener("resize", setReviewTrackHeight);
  if (document.fonts?.ready) {
    document.fonts.ready.then(setReviewTrackHeight);
  }

  setReviewTrackHeight();
  showReview(0);
  startReviewTimer();
}


/* =============================================================
   SALON POLICY ACCORDION
   =============================================================
   Every .policy-toggle controls the details directly beneath it.
   The button text switches between View and Close. Only the selected
   policy changes, so visitors may keep more than one policy open if desired.
   ============================================================= */
const policyToggles = document.querySelectorAll(".policy-toggle");

policyToggles.forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const detailsId = toggle.getAttribute("aria-controls");
    const details = detailsId ? document.getElementById(detailsId) : null;
    if (!details) return;

    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    details.hidden = isOpen;

    const action = toggle.querySelector(".policy-action");
    if (action) action.textContent = isOpen ? "View" : "Close";
  });
});

/* =============================================================
   RESPONSIVE HOME GALLERY COLUMNS
   =============================================================
   Phone/tablet CSS Grid rows inherit the height of the tallest image in each
   row, which can leave a large blank hole under a shorter portrait. On screens
   up to 1024px, the gallery is therefore split into TWO independent stacking
   columns. This keeps the edited portrait photos aligned tightly with no large
   empty spaces while preserving the desktop gallery exactly as designed.

   The assignment also keeps the two vivid blue hairstyles separated:
     LEFT:  Black Waves -> Blue/Purple -> Blonde Texture -> Burgundy
     RIGHT: Magenta -> Long Blonde -> Vivid Blue
   ============================================================= */
const responsiveHomeGallery = document.querySelector('.editorial-gallery .work-gallery');

if (responsiveHomeGallery) {
  const originalGalleryCards = Array.from(responsiveHomeGallery.children).filter((element) => element.classList.contains('work-gallery-card'));
  let leftGalleryColumn = null;
  let rightGalleryColumn = null;

  function applyResponsiveHomeGallery() {
    const useStackedColumns = window.matchMedia('(max-width: 1024px)').matches;

    if (useStackedColumns) {
      if (!leftGalleryColumn || !rightGalleryColumn) {
        leftGalleryColumn = document.createElement('div');
        rightGalleryColumn = document.createElement('div');
        leftGalleryColumn.className = 'mobile-gallery-column mobile-gallery-column-left';
        rightGalleryColumn.className = 'mobile-gallery-column mobile-gallery-column-right';
      }

      if (!leftGalleryColumn.isConnected) responsiveHomeGallery.appendChild(leftGalleryColumn);
      if (!rightGalleryColumn.isConnected) responsiveHomeGallery.appendChild(rightGalleryColumn);

      /* Cards in the source HTML:
         0 Black Waves, 1 Blue/Purple, 2 Long Blonde, 3 Magenta,
         4 Vivid Blue, 5 Blonde Texture, 6 Burgundy. */
      [0, 1, 5, 6].forEach((index) => {
        if (originalGalleryCards[index]) leftGalleryColumn.appendChild(originalGalleryCards[index]);
      });
      [3, 2, 4].forEach((index) => {
        if (originalGalleryCards[index]) rightGalleryColumn.appendChild(originalGalleryCards[index]);
      });

      responsiveHomeGallery.classList.add('is-responsive-masonry');
    } else {
      /* Restore the original desktop DOM order before removing the wrappers. */
      originalGalleryCards.forEach((card) => responsiveHomeGallery.appendChild(card));
      leftGalleryColumn?.remove();
      rightGalleryColumn?.remove();
      responsiveHomeGallery.classList.remove('is-responsive-masonry');
    }
  }

  applyResponsiveHomeGallery();
  window.addEventListener('resize', applyResponsiveHomeGallery);
}


/* =============================================================
   WELCOMING EDITORIAL INTERACTIONS
   =============================================================
   1. Adds gentle reveal-on-scroll motion to important page elements.
   2. Adds a phone/tablet quick-contact bar so visitors can call Marni or
      reach the Instagram/contact area without hunting through the page.

   Accessibility:
   - Motion is skipped when the visitor prefers reduced motion.
   - The quick-contact bar uses normal links and descriptive labels.
   ============================================================= */

/* ---------- Gentle scroll reveal ---------- */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealSelectors = [
  /* The Home hero has its own page-load entrance animation in CSS. */
  ".brand-story-image",
  ".brand-story-content > *",
  ".section-heading > *",
  ".work-gallery-card",
  ".preview-card",
  ".education-banner > div > *",
  ".education-banner > .button",
  ".registration-reviews",
  ".registration-form-column",
  ".service-section-heading > *",
  ".compact-service-card",
  ".policy-item",
  ".footer-grid > div"
];

const revealElements = Array.from(document.querySelectorAll(revealSelectors.join(",")));

revealElements.forEach((element, index) => {
  element.classList.add("reveal-on-scroll");
  /* Small repeating stagger keeps large grids from animating all at once. */
  element.style.setProperty("--reveal-delay", `${(index % 4) * 65}ms`);
});

if (prefersReducedMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
}

/* ---------- Mobile + tablet quick contact ---------- */
const existingQuickContact = document.querySelector(".mobile-quick-contact");

if (!existingQuickContact) {
  const footerInstagram = document.querySelector(".instagram-button");
  const savedInstagramHref = footerInstagram?.getAttribute("href") || "";

  /*
     INSTAGRAM NOTE:
     The footer now contains Marni's live Instagram URL. The quick-contact
     Instagram button automatically inherits that same URL so it only needs
     to be updated in one place if her handle ever changes.
  */
  const instagramIsReady = savedInstagramHref && savedInstagramHref !== "#";
  const instagramHref = instagramIsReady ? savedInstagramHref : "#contact";

  const quickContact = document.createElement("nav");
  quickContact.className = "mobile-quick-contact";
  quickContact.setAttribute("aria-label", "Quick contact Marni");
  quickContact.innerHTML = `
    <a href="tel:+17733592491" aria-label="Call Marni at Genetik Bleu Salon">Call Marni</a>
    <a href="${instagramHref}" ${instagramIsReady ? 'target="_blank" rel="noopener noreferrer"' : ""} aria-label="Contact Marni on Instagram">Instagram</a>
  `;

  document.body.appendChild(quickContact);
  document.body.classList.add("has-mobile-quick-contact");
}


/* =============================================================
   FINAL PRESENTATION POLISH
   =============================================================
   HERO SCROLL CUE:
   The small "Explore" cue is useful when the full-screen hero first loads,
   but it should not follow the visitor around. It fades out after the first
   small scroll and remains hidden for the rest of that page view.
   ============================================================= */
const heroScrollCue = document.querySelector(".hero-scroll-cue");

if (heroScrollCue) {
  let cueDismissed = false;

  const dismissHeroCue = () => {
    if (cueDismissed || window.scrollY < 36) return;
    cueDismissed = true;
    heroScrollCue.classList.add("is-hidden");
    window.removeEventListener("scroll", dismissHeroCue);
  };

  window.addEventListener("scroll", dismissHeroCue, { passive: true });
}


/* =============================================================
   COLOR RETOUCH — TWO-PHOTO SERVICE SLIDER
   =============================================================
   - Arrow buttons move forward/back.
   - A horizontal swipe changes photos on touch devices.
   - The current index is stored on the slider element so the regular card
     and the full-screen lightbox always stay synchronized.
   ============================================================= */
const servicePhotoSliders = document.querySelectorAll('[data-service-slider]');

servicePhotoSliders.forEach((slider) => {
  const previousButton = slider.querySelector('[data-slider-prev]');
  const nextButton = slider.querySelector('[data-slider-next]');
  const data = getServiceSliderData(slider);
  let touchStartX = null;

  if (!data || data.images.length < 2) return;

  setServiceSliderIndex(slider, Number(slider.dataset.currentIndex || 0));

  function moveSlider(direction) {
    const currentIndex = Number(slider.dataset.currentIndex || 0);
    setServiceSliderIndex(slider, currentIndex + direction);
  }

  previousButton?.addEventListener('click', () => moveSlider(-1));
  nextButton?.addEventListener('click', () => moveSlider(1));

  slider.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  slider.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
    const distance = touchEndX - touchStartX;
    touchStartX = null;

    if (Math.abs(distance) < 45) return;
    moveSlider(distance > 0 ? -1 : 1);
  }, { passive: true });
});



/* =============================================================
   MARNSTARR STAR INTERACTION
   =============================================================
   The full star animation plays once when The Marnstarr Experience first
   enters the viewport. On phones/tablets, tapping the star replays it.
   Desktop hover twinkle is handled in CSS.

   Accessibility:
   Visitors who prefer reduced motion receive a static star.
   ============================================================= */
const marnstarrSection = document.querySelector("#marnstarr");
const marnstarrStar = document.querySelector(".marnstarr-star");

if (marnstarrSection && marnstarrStar) {
  const reduceStarMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function replayMarnstarrStar() {
    if (reduceStarMotion) return;

    /* Removing + re-adding the class restarts the CSS keyframes reliably. */
    marnstarrStar.classList.remove("is-spinning");
    void marnstarrStar.offsetWidth;
    marnstarrStar.classList.add("is-spinning");
  }

  if (!reduceStarMotion && "IntersectionObserver" in window) {
    const isTouchLayout = window.matchMedia("(max-width: 1024px)").matches;

    /*
       MOBILE / TABLET:
       Observe the STAR itself, not the entire Marnstarr section. This prevents
       the animation from finishing while the visitor is still scrolling past
       Marni's photo and before the heading is actually visible.

       DESKTOP:
       Keep the earlier section-based entrance timing.
    */
    const observedElement = isTouchLayout ? marnstarrStar : marnstarrSection;

    const starObserver = new IntersectionObserver(
      (entries, observer) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        if (isTouchLayout) {
          /* Small pause after the star becomes clearly visible so the visitor
             has time to visually settle on the heading before it animates. */
          window.setTimeout(replayMarnstarrStar, 160);
        } else {
          replayMarnstarrStar();
        }

        observer.disconnect();
      },
      isTouchLayout
        ? {
            threshold: 0.78,
            rootMargin: "0px 0px -10% 0px"
          }
        : {
            threshold: 0.42,
            rootMargin: "0px 0px -8% 0px"
          }
    );

    starObserver.observe(observedElement);
  } else if (!reduceStarMotion) {
    replayMarnstarrStar();
  }

  /* Click/tap to replay on ALL devices.
     - Desktop/laptop: clicking the star replays the full signature animation.
     - Phone/tablet: tapping the star does the same.
     - Keyboard users can activate it because the star is a real button. */
  marnstarrStar.addEventListener("click", () => {
    replayMarnstarrStar();

    /* Remove focus after pointer activation so a desktop click does not leave
       a persistent focus outline. Keyboard focus behavior remains available. */
    if (window.matchMedia("(pointer: fine)").matches) {
      marnstarrStar.blur();
    }
  });
}
