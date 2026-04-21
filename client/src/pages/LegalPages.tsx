/**
 * Privacy / Terms / Disclaimer pages.
 *
 * Plain-text, lawyer-reviewable copy that documents the software-tool
 * posture. These are not substitutes for a full attorney-drafted set of
 * documents, but they cover the positions we need to hold publicly before
 * launch: (1) we are not your legal representative, (2) we are a
 * per-submission scrivener/software tool, (3) fee terms and the money-
 * back guarantee, (4) data handling basics.
 *
 * All three pages share the same shell so copy edits don't diverge.
 */

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      <div className="container max-w-3xl py-16">
        <h1 className="font-display text-4xl font-bold text-[#0F172A] mb-2">{title}</h1>
        <p className="text-sm text-[#64748B] mb-8">Last updated: {updated}</p>
        <article className="prose prose-slate max-w-none text-[#334155]">
          {children}
        </article>
      </div>
      <Footer />
    </div>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="April 2026">
      <p>
        AppraiseAI, Inc. (&ldquo;AppraiseAI&rdquo;, &ldquo;we&rdquo;) operates
        software that helps property owners file their own tax-assessment
        appeals. This policy explains what we collect, what we do with it, and
        how you can see or delete your data.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Property information you submit:</strong> address, county,
          assessed value, property details.
        </li>
        <li>
          <strong>Contact information:</strong> email, phone if provided.
        </li>
        <li>
          <strong>Taxpayer identifiers for a filing run:</strong> PIN and
          account number from your assessment notice. These are used once to
          file and are wiped from our database once the filing completes.
        </li>
        <li>
          <strong>Authorization records:</strong> your typed signature, IP
          address, browser, and the exact authorization text you approved.
        </li>
        <li>
          <strong>Usage telemetry:</strong> basic logs of which pages you
          visited and which analyses ran, retained for operational debugging.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use your data to run the property analysis, generate an appraisal
        report, and (if you choose) submit your appeal to your county&apos;s
        online portal on your behalf. We do not sell your data. We do not
        share your data with third parties except the narrowly-scoped service
        providers we need to operate (Stripe for payments, AWS for storage,
        county portals for filing).
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        You can request deletion of your account and all associated submissions
        by emailing{" "}
        <a href="mailto:privacy@appraiseai.com">privacy@appraiseai.com</a>. We
        will honor deletion within 30 days except where we are required to
        retain records for tax, legal, or accounting purposes (e.g. Stripe
        transaction records, which we retain for seven years).
      </p>

      <h2>Your rights</h2>
      <p>
        If you are a California resident under the CCPA or a resident of a
        state with similar consumer-privacy legislation, you have the right to
        (a) know what we have collected about you, (b) request deletion, (c)
        opt out of sale (we do not sell data), and (d) not be discriminated
        against for exercising these rights. To exercise any right, email
        privacy@appraiseai.com.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href="mailto:privacy@appraiseai.com">privacy@appraiseai.com</a>.
      </p>
    </LegalShell>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms of Service" updated="April 2026">
      <p>
        These terms govern your use of AppraiseAI. Please read them carefully.
        By creating an account or using the service, you agree to these terms.
      </p>

      <h2>What we are</h2>
      <p>
        AppraiseAI is a software tool. We help you complete, review, and
        submit a property-tax-assessment appeal in your own name. We are not
        a law firm, we do not provide legal advice about your specific case,
        and we do not represent you in a legal capacity. Where our software
        automates a filing on your behalf, it does so as a scrivener — a tool
        that fills forms and clicks buttons you have reviewed and authorized.
      </p>

      <h2>Your responsibility</h2>
      <p>
        You are the filer of your appeal. You are responsible for the accuracy
        of the information you provide, including taxpayer identifiers such as
        your PIN and account number. You represent that you are the owner of
        the subject property or have authority to act for the owner of record.
      </p>

      <h2>Fees and refunds</h2>
      <p>
        Pricing is flat-fee per filing, shown to you at checkout. We do not
        charge contingency fees.
      </p>
      <p>
        <strong>Money-back guarantee:</strong> If the county does not reduce
        your assessment as a result of the appeal we filed on your behalf, you
        may request a full refund of the software fee within 60 days of the
        county&apos;s decision by emailing refunds@appraiseai.com or using the
        in-app refund request form. Refunds are issued to the original payment
        method.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to submit false information, not to file appeals on
        properties you do not own or have authority to represent, and not to
        reverse-engineer or scrape the service.
      </p>

      <h2>Limitations</h2>
      <p>
        The service is provided on an &ldquo;as is&rdquo; basis. We do not
        guarantee that any particular appeal will succeed. We are not liable
        for any decision your county makes or does not make. Our liability to
        you for any claim relating to the service is limited to the fees you
        have paid us in the twelve months preceding the claim.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. Material changes will be
        announced by email to your account. Continued use after a change
        constitutes acceptance of the updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:support@appraiseai.com">support@appraiseai.com</a>
      </p>
    </LegalShell>
  );
}

export function Disclaimer() {
  return (
    <LegalShell title="Legal Disclaimer" updated="April 2026">
      <p className="text-lg font-semibold text-[#0F172A]">
        AppraiseAI is a software tool. AppraiseAI is not a law firm. Nothing
        on this site is legal advice.
      </p>

      <h2>Not a law firm; no attorney-client relationship</h2>
      <p>
        Using AppraiseAI does not create an attorney-client relationship between
        you and AppraiseAI or any of its employees. Our communications with you
        are not protected by attorney-client privilege. If you need legal
        advice about your specific property-tax situation, please consult a
        licensed attorney or a licensed property-tax consultant in your
        jurisdiction.
      </p>

      <h2>Pro se filing</h2>
      <p>
        When you use AppraiseAI to file, you are filing pro se — that is, you
        are representing yourself. AppraiseAI provides you with pre-filled
        forms, a supporting data analysis, and (for eligible counties)
        automated submission of your appeal through your county&apos;s online
        portal. You remain the filer of record.
      </p>

      <h2>No guarantee of outcome</h2>
      <p>
        We cannot and do not guarantee that any particular appeal will succeed.
        Our appeal-strength scores and savings estimates are data-driven
        predictions, not promises. Actual outcomes depend on your county&apos;s
        evidentiary standards and the discretion of the appraisal review board.
      </p>

      <h2>Accuracy of data</h2>
      <p>
        Our analysis pulls from public assessor records and commercial real-
        estate data providers. While we aim for accuracy, errors in those
        source datasets may flow through to our analysis. Please review all
        generated documents before authorizing submission.
      </p>

      <h2>Money-back guarantee</h2>
      <p>
        See our <a href="/terms">Terms of Service</a> for the full money-back
        guarantee.
      </p>
    </LegalShell>
  );
}
