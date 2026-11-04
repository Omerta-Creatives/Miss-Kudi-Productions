"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export interface JourneySlide {
  step: string;
  stageTag: string;
  shortLabel: string;
  eyebrow: string;
  titleMain: string;
  titleAccent: string;
  description: string;
  facility: string;
  leadRole: string;
  telemetryMetric: string;
  deliverableBadge: string;
  image: string;
  alt: string;
  ctaLabel: string;
  ctaHref: string;
}

const JOURNEY_SLIDES: JourneySlide[] = [
  {
    step: "01",
    stageTag: "CHAPTER 01 / 06 · ATELIER BRIEF & INTAKE",
    shortLabel: "Atelier Intake",
    eyebrow: "A PRODUCTION PARTNER FOR FASHION BRANDS",
    titleMain: "Your designs. Our expertise.",
    titleAccent: "Production at scale.",
    description:
      "Your collection starts at our timber drafting tables. We audit your tech packs, reference garments, target GSM weights, and XS–XXL size ratios to issue an instant Job Code and Bill of Materials.",
    facility: "Yaba Flagship & VI Atelier",
    leadRole: "Merchandising & Production Desk",
    telemetryMetric: "Day 1–2 · Instant Job Ticket",
    deliverableBadge: "MOQ 50 – 5,000+ PCS",
    image: "/images/hero-lagos-atelier.jpg",
    alt: "Master tailors and pattern designers working at timber drafting tables inside the Miss Kudi Productions garment atelier in Lagos, Nigeria",
    ctaLabel: "Instant Quote & Job Ticket",
    ctaHref: "/quote",
  },
  {
    step: "02",
    stageTag: "CHAPTER 02 / 06 · CAD PATTERN & GRADING",
    shortLabel: "CAD Pattern Studio",
    eyebrow: "VICTORIA ISLAND & YABA PATTERN STUDIO",
    titleMain: "Precision CAD blocks &",
    titleAccent: "zero-waste XS–XXL grading.",
    description:
      "Senior Pattern Designers translate your silhouette into digital CAD blocks, grade every point-of-measure across XS–XXL, and craft a first-fit toile sample before a single bulk roll is cut.",
    facility: "Victoria Island Pattern Atelier",
    leadRole: "Senior Pattern Designers",
    telemetryMetric: "94.6% Fabric Marker Yield",
    deliverableBadge: "XS–XXL GRADED SPEC",
    image: "/images/pattern-cutting-studio.jpg",
    alt: "Nigerian pattern designer inspecting graded CAD garment blocks, brass pattern weights and fabric bolts",
    ctaLabel: "Size & Ratio Calculator",
    ctaHref: "/size-charts",
  },
  {
    step: "03",
    stageTag: "CHAPTER 03 / 06 · CUTTING & PRIVATE-LABEL TRIMS",
    shortLabel: "Cutting & Trims",
    eyebrow: "MULTI-PLY CUTTING & BRANDED HARDWARE",
    titleMain: "24-hour fabric relaxation &",
    titleAccent: "custom woven damask labels.",
    description:
      "Fabric bolts relax for 24 hours before multi-ply cutting. Every bundle is shade-lot tagged and paired with your brand's custom woven damask neck labels, satin care tags, and YKK hardware.",
    facility: "Yaba Cutting & Trim Vault",
    leadRole: "Cutting Masters & Trim Specialists",
    telemetryMetric: "100% Cut-Panel Inspection",
    deliverableBadge: "PRIVATE-LABEL READY",
    image: "/images/private-label-finishing.jpg",
    alt: "Macro flat-lay of custom woven Miss Kudi damask neck labels, corozo buttons, spec tags and folded olive and ecru textiles",
    ctaLabel: "Explore Private-Label Specs",
    ctaHref: "/services",
  },
  {
    step: "04",
    stageTag: "CHAPTER 04 / 06 · INDUSTRIAL SEWING FLOOR",
    shortLabel: "Bulk Sewing Line",
    eyebrow: "92+ INDUSTRIAL JUKI & BROTHER STATIONS",
    titleMain: "Balanced cut-and-sew lines",
    titleAccent: "built for volume & precision.",
    description:
      "Dedicated industrial sewing lines are balanced specifically to your garment construction. Master Tailors execute consistent stitch-per-inch tension across streetwear, tailoring, and resortwear.",
    facility: "Plant 01 · Yaba Flagship Floor",
    leadRole: "Master Tailor Leads",
    telemetryMetric: "92 Active Sewing Stations",
    deliverableBadge: "35,500+ PCS / MONTH",
    image: "/images/sewing-production-line.jpg",
    alt: "Nigerian master tailors operating industrial lockstitch sewing machines in Lagos garment factory floor",
    ctaLabel: "Inspect 5-Stage Workflow",
    ctaHref: "/process",
  },
  {
    step: "05",
    stageTag: "CHAPTER 05 / 06 · AQL 2.5 AUDIT & STEAM FINISHING",
    shortLabel: "AQL 2.5 Quality Bay",
    eyebrow: "36-POINT MEASUREMENT & FINISHING BAY",
    titleMain: "Strict AQL 2.5 quality gates",
    titleAccent: "& vacuum-steam finishing.",
    description:
      "Every batch undergoes strict AQL 2.5 inspection on dress forms and measurement tables. Approved garments are thread-trimmed, vacuum-steam pressed, barcode-polybagged, and manifested for dispatch.",
    facility: "Plant 03 · Ikeja Export Depot",
    leadRole: "AQL 2.5 QC Inspectors",
    telemetryMetric: "99.4% AQL 2.5 Pass Rate",
    deliverableBadge: "ISO / AQL 2.5 CERTIFIED",
    image: "/images/qc-finishing-bay.jpg",
    alt: "Quality control inspector measuring tailored olive blazer on a dress form in Lagos finishing bay",
    ctaLabel: "View Quality Standards",
    ctaHref: "/process",
  },
  {
    step: "06",
    stageTag: "CHAPTER 06 / 06 · SHOWROOM & GLOBAL DISPATCH",
    shortLabel: "Retail Launch",
    eyebrow: "3 TO 5 WEEKS TURNAROUND · GLOBAL DISPATCH",
    titleMain: "Retail-ready collections",
    titleAccent: "delivered to your showroom.",
    description:
      "From first pattern block to packed export cartons in 3 to 5 weeks. Your collection arrives pressed, labeled, and ready for flagship retail rails or direct-to-consumer fulfillment worldwide.",
    facility: "Lagos & Global Air Cargo",
    leadRole: "Export & Dispatch Desk",
    telemetryMetric: "3 – 5 Weeks Turnaround",
    deliverableBadge: "GLOBAL DISPATCH",
    image: "/images/lagos-atelier-lookbook.jpg",
    alt: "Victoria Island fashion atelier showroom with olive linen blazers and resortwear on brass rail",
    ctaLabel: "Start Your Production Run",
    ctaHref: "/quote",
  },
];

export default function AnimatedHero() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const filmstripRef = useRef<HTMLDivElement | null>(null);

  const totalSlides = JOURNEY_SLIDES.length;
  const activeSlide = JOURNEY_SLIDES[activeIndex];

  const goToSlide = useCallback(
    (index: number) => {
      const normalized = ((index % totalSlides) + totalSlides) % totalSlides;
      setActiveIndex(normalized);
    },
    [totalSlides]
  );

  const handleNext = useCallback(() => {
    goToSlide(activeIndex + 1);
  }, [activeIndex, goToSlide]);

  const handlePrev = useCallback(() => {
    goToSlide(activeIndex - 1);
  }, [activeIndex, goToSlide]);

  // Auto-advance journey every 6s unless paused or reduced-motion is preferred
  useEffect(() => {
    if (isPaused) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [isPaused, totalSlides]);

  // Sync bottom filmstrip active item gently
  useEffect(() => {
    const scroller = filmstripRef.current;
    if (!scroller) return;
    const items = scroller.querySelectorAll<HTMLElement>(".hero-fs-step-card");
    const target = items[activeIndex];
    if (!target) return;
    const targetLeft =
      target.offsetLeft - scroller.clientWidth / 2 + target.clientWidth / 2;
    scroller.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [activeIndex]);

  // modern-web-guidance: carousel-slide-effects Web Animations API fallback
  useEffect(() => {
    if (typeof window === "undefined" || typeof CSS === "undefined") return;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      CSS.supports("(animation-timeline: view()) and (animation-range: entry)")
    ) {
      return;
    }

    const scroller = filmstripRef.current;
    if (!scroller) return;
    const entries = Array.from(
      scroller.querySelectorAll<HTMLElement>(".hero-fs-step-card")
    );
    const animations = new Map<HTMLElement, Animation>();

    entries.forEach((entry) => {
      const anim = entry.animate(
        {
          transform: ["scale(0.94)", "scale(1)", "scale(0.94)"],
          opacity: [0.75, 1, 0.75],
        },
        {
          duration: 1,
          fill: "both",
        }
      );
      anim.pause();
      animations.set(entry, anim);
    });

    const tick = () => {
      const scrollerRect = scroller.getBoundingClientRect();
      if (scrollerRect.width <= 0) return;
      entries.forEach((entry) => {
        const anim = animations.get(entry);
        if (!anim) return;
        const entryRect = entry.getBoundingClientRect();
        const rawProgress =
          (entryRect.left + entryRect.width / 2 - scrollerRect.left) /
          scrollerRect.width;
        const clamped = Math.max(0, Math.min(1, rawProgress));
        anim.currentTime = clamped;
      });
    };

    scroller.addEventListener("scroll", tick, { passive: true });
    tick();

    return () => {
      scroller.removeEventListener("scroll", tick);
      animations.forEach((anim) => anim.cancel());
    };
  }, []);

  const getRelativeOffset = (idx: number) => {
    let diff = idx - activeIndex;
    if (diff > totalSlides / 2) diff -= totalSlides;
    if (diff < -totalSlides / 2) diff += totalSlides;
    return diff;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(deltaX) > 42) {
      if (deltaX < 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const journeyProgressPct = Math.round(((activeIndex + 1) / totalSlides) * 100);

  return (
    <section
      className="hero-fs-stage"
      aria-label="Miss Kudi Productions Fullscreen 3D Production Journey"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Fullscreen 3D Perspective Slider Deck */}
      <div className="hero-fs-3d-viewport">
        {JOURNEY_SLIDES.map((slide, idx) => {
          const offset = getRelativeOffset(idx);
          const isCenter = offset === 0;
          const posClass =
            offset === 0
              ? "fs-slide-center"
              : offset === -1
              ? "fs-slide-prev"
              : offset === 1
              ? "fs-slide-next"
              : offset === -2
              ? "fs-slide-far-prev"
              : offset === 2
              ? "fs-slide-far-next"
              : "fs-slide-hidden";

          return (
            <article
              key={slide.step}
              id={`fs-journey-slide-${slide.step}`}
              role="tabpanel"
              aria-hidden={!isCenter}
              className={`hero-fs-slide ${posClass}`}
              onClick={() => {
                if (!isCenter) goToSlide(idx);
              }}
            >
              {/* Fullscreen Background Photography */}
              <img
                src={slide.image}
                alt={slide.alt}
                width={1920}
                height={1080}
                fetchPriority={idx === 0 ? "high" : "auto"}
                loading={idx === 0 ? "eager" : "lazy"}
                decoding="async"
                className="hero-fs-bg-img"
              />
              <div className="hero-fs-backdrop-scrim" aria-hidden="true" />

              {/* Fullscreen Editorial Content Overlay */}
              <div className="hero-fs-content-shell">
                {/* Top Telemetry Bar Inside Fullscreen Hero */}
                <div className="hero-fs-topbar">
                  <div className="hero-fs-badges">
                    <span className="hero-fs-chip-primary mono">{slide.stageTag}</span>
                    <span className="hero-fs-chip-outline mono">
                      {slide.deliverableBadge}
                    </span>
                  </div>

                  <div className="hero-fs-telemetry-pill">
                    <span className="status-dot" />
                    <span className="mono">{slide.facility}</span>
                    <span aria-hidden="true">·</span>
                    <span>{slide.leadRole}</span>
                    <span aria-hidden="true">·</span>
                    <strong className="mono">{slide.telemetryMetric}</strong>
                  </div>
                </div>

                {/* Main Center Hero Headline & Narrative */}
                <div className="hero-fs-main-grid">
                  <div className="hero-fs-copy-block">
                    <p className="hero-fs-eyebrow mono">
                      <span className="hero-fs-eyebrow-line" /> {slide.eyebrow}
                    </p>
                    {idx === 0 ? (
                      <h1 className="hero-fs-title">
                        {slide.titleMain}
                        <br />
                        <em>{slide.titleAccent}</em>
                      </h1>
                    ) : (
                      <h2 className="hero-fs-title">
                        {slide.titleMain}
                        <br />
                        <em>{slide.titleAccent}</em>
                      </h2>
                    )}
                    <p className="hero-fs-description">{slide.description}</p>

                    <div className="hero-fs-actions">
                      <Link
                        href={slide.ctaHref}
                        className="button hero-fs-btn-gold"
                        tabIndex={isCenter ? 0 : -1}
                      >
                        {slide.ctaLabel} <span>↗</span>
                      </Link>
                      {activeIndex < totalSlides - 1 ? (
                        <button
                          type="button"
                          className="button hero-fs-btn-glass"
                          tabIndex={isCenter ? 0 : -1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                          }}
                        >
                          Next Chapter: {JOURNEY_SLIDES[activeIndex + 1].shortLabel}{" "}
                          <span>→</span>
                        </button>
                      ) : (
                        <a
                          href="#about"
                          className="button hero-fs-btn-glass"
                          tabIndex={isCenter ? 0 : -1}
                        >
                          Enter Section 01: Manifesto <span>↓</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Right Floating 3D Next-Chapter Preview Card */}
                  <div className="hero-fs-next-card-wrap">
                    <div
                      className="hero-fs-next-preview-card"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNext();
                      }}
                      role="button"
                      tabIndex={isCenter ? 0 : -1}
                      aria-label={`Preview next stage: ${
                        JOURNEY_SLIDES[(idx + 1) % totalSlides].shortLabel
                      }`}
                    >
                      <div className="hero-fs-next-card-head mono">
                        <span>UP NEXT IN THE JOURNEY</span>
                        <span>STAGE {JOURNEY_SLIDES[(idx + 1) % totalSlides].step} →</span>
                      </div>
                      <div className="hero-fs-next-card-media">
                        <img
                          src={JOURNEY_SLIDES[(idx + 1) % totalSlides].image}
                          alt=""
                          width={420}
                          height={260}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div className="hero-fs-next-card-meta">
                        <strong>
                          {JOURNEY_SLIDES[(idx + 1) % totalSlides].shortLabel}
                        </strong>
                        <span>
                          {JOURNEY_SLIDES[(idx + 1) % totalSlides].telemetryMetric}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom Docked Full-Width Journey Filmstrip & Controls */}
      <div className="hero-fs-bottom-dock">
        <div className="hero-fs-progress-track" aria-hidden="true">
          <div
            className="hero-fs-progress-fill"
            style={{ width: `${journeyProgressPct}%` }}
          />
        </div>

        <div className="hero-fs-dock-inner">
          <div
            ref={filmstripRef}
            className="hero-fs-steps-scroller"
            role="tablist"
            aria-label="Production Journey Chapters"
          >
            {JOURNEY_SLIDES.map((slide, idx) => {
              const active = idx === activeIndex;
              const passed = idx < activeIndex;
              return (
                <button
                  key={slide.step}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-controls={`fs-journey-slide-${slide.step}`}
                  className={`hero-fs-step-card ${active ? "is-active" : ""} ${
                    passed ? "is-passed" : ""
                  }`}
                  onClick={() => goToSlide(idx)}
                >
                  <img
                    src={slide.image}
                    alt=""
                    width={96}
                    height={64}
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="hero-fs-step-card-text">
                    <span className="mono">STAGE {slide.step}</span>
                    <strong>{slide.shortLabel}</strong>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="hero-fs-dock-controls">
            <div className="hero-fs-nav-group">
              <button
                type="button"
                className="hero-fs-ctrl-btn"
                onClick={handlePrev}
                aria-label="Previous chapter"
              >
                ←
              </button>
              <button
                type="button"
                className="hero-fs-ctrl-btn"
                onClick={() => setIsPaused((p) => !p)}
                aria-label={isPaused ? "Resume autoplay" : "Pause autoplay"}
              >
                {isPaused ? "▶" : "❚❚"}
              </button>
              <button
                type="button"
                className="hero-fs-ctrl-btn"
                onClick={handleNext}
                aria-label="Next chapter"
              >
                →
              </button>
            </div>

            <a href="#about" className="hero-fs-flow-conduit">
              <span className="mono">
                {journeyProgressPct}% JOURNEY · FLOW TO SECTION 01
              </span>
              <span className="hero-fs-flow-arrow">↓</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
