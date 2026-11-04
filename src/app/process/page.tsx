import Link from "next/link";
import { processStages } from "../data";

export default function Process() {
  return (
    <main>
      {/* Architectural Dark-Olive Editorial Hero Stage */}
      <section className="marketing-stage-hero">
        <img
          src="/images/pattern-cutting-studio.jpg"
          alt="Pattern designer and cutting master inspecting graded CAD garment blueprints and fabric bolts"
          width={1920}
          height={1080}
          fetchPriority="high"
          decoding="async"
          className="marketing-stage-bg"
        />
        <div className="marketing-stage-scrim" aria-hidden="true" />

        <div className="marketing-stage-inner section-wrap">
          <div className="marketing-stage-grid">
            <div className="marketing-stage-copy">
              <div className="hero-fs-badges" style={{ marginBottom: 18 }}>
                <span className="hero-fs-chip-primary mono">
                  03 / HOW WE WORK · 5-STAGE PIPELINE
                </span>
                <span className="hero-fs-chip-outline mono">
                  QUALITY-GATED MILESTONES
                </span>
              </div>

              <h1 className="hero-fs-title">
                From your brief
                <br />
                <em>to bulk production.</em>
              </h1>

              <p className="hero-fs-description">
                Every Miss Kudi Productions order travels through five documented, quality-gated
                stages — connecting our Pattern Studio, Cutting Tables, Sewing Lines, and AQL 2.5
                Finishing Bay into one continuous manufacturing journey.
              </p>

              <div className="hero-fs-actions">
                <Link className="button hero-fs-btn-gold" href="/quote">
                  Start Stage 01 Brief <span>↗</span>
                </Link>
                <Link className="button hero-fs-btn-glass" href="/size-charts">
                  Size &amp; Ratio Calculator <span>⊞</span>
                </Link>
              </div>
            </div>

            <div className="marketing-stage-card">
              <div className="marketing-stage-card-head mono">
                <span>FIVE-STAGE FLOOR TIMELINE</span>
                <span>3 – 5 WEEKS TOTAL</span>
              </div>
              <div className="marketing-stage-metrics">
                <div>
                  <span className="mono">STAGES 01 – 02</span>
                  <strong className="mono">Days 1 – 7</strong>
                  <small>Brief Intake, CAD Pattern &amp; Costing</small>
                </div>
                <div>
                  <span className="mono">STAGE 03</span>
                  <strong className="mono">Week 2</strong>
                  <small>PPS Sign-Off &amp; Multi-Ply Cutting</small>
                </div>
                <div>
                  <span className="mono">STAGES 04 – 05</span>
                  <strong className="mono">Weeks 3 – 5</strong>
                  <small>Bulk Sewing, AQL 2.5 QC &amp; Dispatch</small>
                </div>
              </div>
              <a href="#stage-01" className="marketing-stage-scroll mono">
                <span>JUMP TO STAGE-BY-STAGE JOURNEY</span>
                <span>↓</span>
              </a>
            </div>
          </div>

          {/* Quick Stage Jump Ribbon */}
          <nav className="process-jump-ribbon" aria-label="Jump to production stage">
            {processStages.map((stage) => (
              <a
                key={stage.number}
                href={`#stage-${stage.number}`}
                className="process-jump-pill mono"
              >
                <span>STAGE {stage.number}</span>
                <strong>{stage.title}</strong>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {/* Detailed 5-Stage Connected Journey Timeline */}
      <section className="section-wrap" style={{ paddingTop: 84, paddingBottom: 96 }}>
        <div className="section-heading">
          <div>
            <div className="section-kicker mono">STAGE-BY-STAGE EXECUTION</div>
            <h2>
              Transparent milestones at
              <br />
              <em>every station on the floor.</em>
            </h2>
          </div>
          <p>
            Each stage is signed off by a dedicated specialist before your order advances to the
            next station.
          </p>
        </div>

        <div className="process-journey-timeline">
          {processStages.map((stage, idx) => (
            <article
              key={stage.number}
              id={`stage-${stage.number}`}
              className="process-stage-card"
            >
              <div className="process-stage-copy">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <span className="mkp-badge mkp-badge-olive">{stage.stageCode}</span>
                  <span
                    className="mono"
                    style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)" }}
                  >
                    ⏱ {stage.duration}
                  </span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.2vw, 25px)", margin: "0 0 6px" }}>
                  {stage.number}. {stage.title}
                </h3>
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: "#6c5d4c",
                    marginBottom: 12,
                  }}
                >
                  Lead Station: {stage.leadRole}
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    lineHeight: 1.8,
                    color: "var(--text-secondary)",
                    marginBottom: 16,
                  }}
                >
                  {stage.copy}
                </p>
                <div className="ticket-label" style={{ marginBottom: 8 }}>
                  MANDATORY STAGE DELIVERABLES &amp; QC GATES
                </div>
                <ul className="service-deliverables-list">
                  {stage.checkpoints.map((cp) => (
                    <li key={cp}>{cp}</li>
                  ))}
                </ul>
              </div>

              <figure className="process-stage-figure">
                <img
                  src={stage.image}
                  alt={stage.alt}
                  width={640}
                  height={440}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
                <figcaption className="image-caption">
                  <span>{stage.stageCode}</span>
                  <span className="mono">{stage.duration}</span>
                </figcaption>
              </figure>
            </article>
          ))}
        </div>

        <div className="marketing-bottom-cta-banner">
          <div>
            <span className="section-kicker mono" style={{ color: "#d4af37" }}>
              READY TO ENTER STAGE 01?
            </span>
            <h3>Generate your instant Job Code &amp; Pro-Forma Quote.</h3>
            <p>
              Includes live MOQ volume discounts, fabric consumption yardage and a printable
              Factory Job Ticket.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="button hero-fs-btn-gold" href="/quote">
              Configure Production Quote <span>↗</span>
            </Link>
            <Link className="button hero-fs-btn-glass" href="/size-charts">
              Size &amp; Ratio Calculator <span>⊞</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
