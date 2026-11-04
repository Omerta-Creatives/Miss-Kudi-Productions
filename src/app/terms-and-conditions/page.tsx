import Link from "next/link";

export default function TermsAndConditions() {
  return (
    <main>
      <section className="policy-section section-wrap" id="terms-and-conditions">
        <div className="section-heading">
          <div>
            <div className="section-kicker">08 / TERMS & CONDITIONS</div>
            <h2>Terms & Conditions</h2>
          </div>
        </div>
        <p>By engaging Miss Kudi Productions, you agree to the following terms:</p>
        <ul>
          <li>All designs, specifications, and artwork provided remain the intellectual property of the client unless otherwise agreed.</li>
          <li>Production timelines are estimates; delays caused by material availability or client revisions may extend delivery dates.</li>
          <li>Payments are due as outlined in the quotation; late payments may incur a 2% monthly interest.</li>
          <li>We reserve the right to refuse orders that conflict with our ethical or legal standards.</li>
        </ul>
        <p>For full legal details, contact us at <Link href="mailto:info@misskudi.com">info@misskudi.com</Link> or at our office at 1 Alawode Street, Lagos, Nigeria.</p>
      </section>
    </main>
  );
}
