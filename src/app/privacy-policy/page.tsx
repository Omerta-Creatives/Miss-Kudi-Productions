import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <main>
      <section className="policy-section section-wrap" id="privacy-policy">
        <div className="section-heading">
          <div>
            <div className="section-kicker">06 / PRIVACY POLICY</div>
            <h2>Privacy Policy</h2>
          </div>
        </div>
        <p>This privacy policy outlines how Miss Kudi Productions collects, uses, and protects personal information of clients and website visitors.</p>
        <ul>
          <li>We collect contact information only when you voluntarily submit an inquiry or quote.</li>
          <li>Data is stored securely and used solely for production communication.</li>
          <li>We do not share personal data with third parties without consent.</li>
          <li>You may request deletion of your data at any time.</li>
        </ul>
        <p>For full details, contact us at <Link href="mailto:info@misskudi.com">info@misskudi.com</Link> or visit our office at 1 Alawode Street, Lagos, Nigeria.</p>
      </section>
    </main>
  );
}
