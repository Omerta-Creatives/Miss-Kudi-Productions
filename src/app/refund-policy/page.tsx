import Link from "next/link";

export default function RefundPolicy() {
  return (
    <main>
      <section className="policy-section section-wrap" id="refund-policy">
        <div className="section-heading">
          <div>
            <div className="section-kicker">07 / REFUND POLICY</div>
            <h2>Refund Policy</h2>
          </div>
        </div>
        <p>All payments are non‑refundable once production has commenced. If a project is cancelled before any work starts, a full refund will be issued.</p>
        <p>For any disputes, please contact us within 14 days of invoicing at <Link href="mailto:info@misskudi.com">info@misskudi.com</Link> or at 1 Alawode Street, Lagos, Nigeria.</p>
      </section>
    </main>
  );
}
