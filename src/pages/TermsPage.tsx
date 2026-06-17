import { Link } from 'react-router-dom'
import styles from './LegalPage.module.css'

const EFFECTIVE_DATE = '17 June 2026'
const CONTACT_EMAIL = 'legal@myopenpantry.com'
const SERVICE_NAME = 'Pantry'
const SITE_URL = 'myopenpantry.com'

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <main className="wide-col">
        <div className={styles.hero}>
          <Link to="/" className={styles.brand}>{SERVICE_NAME}</Link>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.updated}>Effective date: {EFFECTIVE_DATE}</p>
        </div>

        <div className={styles.body}>
          <div className={styles.notice}>
            Please read these Terms of Service carefully before using {SERVICE_NAME}. By creating an account or using the service you agree to be bound by these terms. If you do not agree, do not use the service.
          </div>

          <h2>1. The Service</h2>
          <p>
            {SERVICE_NAME} ("{SERVICE_NAME}", "we", "us", "our") is an online platform accessible at {SITE_URL} that allows registered users to import, organise, and share personal recipe collections. The service includes AI-powered recipe extraction from screenshots and URLs, social features such as public profiles and community exploration, collections, ratings, and favourites.
          </p>

          <h2>2. Eligibility</h2>
          <p>
            You must be at least 16 years old to create an account. By registering, you confirm that you meet this requirement. If you are under 18 you must have the consent of a parent or legal guardian. We do not knowingly collect data from anyone under 13; if we discover such data has been provided we will delete it immediately.
          </p>

          <h2>3. Your Account</h2>
          <p>
            You are responsible for keeping your login credentials confidential and for all activity that occurs under your account. You agree to notify us immediately at {CONTACT_EMAIL} if you suspect any unauthorised access to your account. We are not liable for any loss or damage arising from your failure to safeguard your credentials.
          </p>
          <p>
            You must provide accurate, current, and complete information during registration and keep it up to date. Accounts created with false information may be suspended or deleted without notice.
          </p>

          <h2>4. User Content</h2>

          <h3>4.1 Your ownership</h3>
          <p>
            You retain all intellectual property rights in the recipes, text, images, and other content you submit to {SERVICE_NAME} ("User Content"). We do not claim ownership of your content.
          </p>

          <h3>4.2 Licence you grant us</h3>
          <p>
            By submitting User Content, you grant {SERVICE_NAME} a worldwide, non-exclusive, royalty-free, sublicensable licence to host, store, reproduce, display, and distribute that content solely for the purposes of operating and improving the service. This licence ends when you delete the content or your account, except where content has already been shared publicly or backed up in our systems.
          </p>

          <h3>4.3 Your responsibility</h3>
          <p>
            You are solely responsible for your User Content. You represent that you own or have the necessary rights to submit your content, and that it does not infringe any third party's intellectual property rights, privacy rights, or any law. You must not submit content that belongs to someone else without permission.
          </p>

          <h3>4.4 Recipe copyright</h3>
          <p>
            Recipes as a list of ingredients are generally not copyright-protected; however, creative expression in recipe instructions may be. When you import content from external sources, you are responsible for ensuring you have the right to do so. {SERVICE_NAME} provides extraction tools for personal use only. Importing recipes for mass redistribution or commercial resale is prohibited.
          </p>

          <h2>5. AI Features</h2>
          <p>
            {SERVICE_NAME} uses artificial intelligence (including third-party AI services) to extract recipe data from screenshots and URLs ("AI Extraction"). You acknowledge and agree that:
          </p>
          <ul>
            <li>AI Extraction results are automatically generated and may contain errors, omissions, or inaccuracies. You are responsible for reviewing and correcting extracted content before relying on it.</li>
            <li>We do not warrant the accuracy, completeness, or fitness for purpose of AI-extracted content, including nutritional information, cooking times, or ingredient quantities.</li>
            <li>Content you submit for AI Extraction is processed by our AI providers in accordance with their terms and data policies. We select providers contractually bound to data confidentiality obligations.</li>
            <li>AI Extraction is provided as a convenience feature. We may adjust, limit, or discontinue AI features at any time.</li>
            <li>AI Extraction is subject to a daily usage limit per account. Attempting to circumvent this limit is a violation of these Terms.</li>
          </ul>
          <p>
            <strong>Important health and allergy notice:</strong> Always verify ingredient information, allergens, and dietary information manually. Never rely solely on AI-extracted data for health-critical decisions.
          </p>

          <h2>6. Public Profiles and Community Features</h2>
          <p>
            If you make your profile public, your display name, recipes you have chosen to make public, your ratings, and your profile information will be visible to other {SERVICE_NAME} users and, depending on your settings, to the public internet. You control your public status from your Profile settings.
          </p>
          <p>
            You may rate and favourite other users' public recipes. Community features (leaderboards, explore, feeds) are provided for personal, non-commercial use. You must not use these features to scrape content, run automated requests, or harvest other users' data.
          </p>

          <h2>7. Acceptable Use</h2>
          <p>You agree not to use the service to:</p>
          <ul>
            <li>Post content that is unlawful, defamatory, abusive, threatening, harassing, obscene, or invasive of another's privacy.</li>
            <li>Infringe any intellectual property or other rights of any party.</li>
            <li>Transmit malware, viruses, or any code designed to disrupt or damage systems.</li>
            <li>Attempt to gain unauthorised access to any part of the service or its infrastructure.</li>
            <li>Use bots, scrapers, or automated tools to access the service without our prior written consent.</li>
            <li>Impersonate another person or entity, or misrepresent your affiliation with any person or entity.</li>
            <li>Engage in any activity that places an unreasonable or disproportionate load on our infrastructure.</li>
            <li>Circumvent any usage limits, access controls, or security measures.</li>
            <li>Use the service for any commercial purpose, including reselling access or content, without our express written consent.</li>
          </ul>
          <p>
            Violation of these rules may result in immediate account suspension or termination without notice and, where appropriate, referral to law enforcement.
          </p>

          <h2>8. Intellectual Property</h2>
          <p>
            The {SERVICE_NAME} name, logo, design, code, and all associated intellectual property are owned by us and protected by applicable intellectual property laws. Nothing in these Terms grants you any right to use our trademarks, logos, or other brand features without our prior written consent.
          </p>
          <p>
            If you believe any content on {SERVICE_NAME} infringes your copyright or other intellectual property rights, please contact us at {CONTACT_EMAIL} with the subject "IP Claim" with details of the material concerned, your ownership claim, and your contact information. We will investigate and act promptly in accordance with applicable law.
          </p>

          <h2>9. Third-Party Services</h2>
          <p>
            The service relies on third-party infrastructure and AI providers, including Cloudflare (hosting, storage, database) and Anthropic (AI processing). Your use of these providers' services through {SERVICE_NAME} is also subject to their respective terms and policies. We are not responsible for the acts or omissions of these third parties.
          </p>
          <p>
            The service may contain links to external websites or services. We have no control over and accept no responsibility for the content or practices of any third-party site or service.
          </p>

          <h2>10. Disclaimer of Warranties</h2>
          <p>
            <strong>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND.</strong> To the fullest extent permitted by law, we disclaim all warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, non-infringement, and accuracy. We do not warrant that the service will be uninterrupted, error-free, or free from harmful components. We do not warrant that any content, including AI-extracted recipes, nutritional data, or cost estimates, is accurate or fit for any particular use.
          </p>

          <h2>11. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, in no event shall {SERVICE_NAME}, its operators, employees, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or other intangible losses, arising from or in connection with your use of or inability to use the service, even if we have been advised of the possibility of such damages.
          </p>
          <p>
            Our total liability to you for any claim arising from or related to the service is limited to the greater of (a) the amount you paid us in the 12 months preceding the claim, or (b) £50 (fifty pounds sterling).
          </p>
          <p>
            Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities. In those jurisdictions, our liability is limited to the greatest extent permitted by law.
          </p>

          <h2>12. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless {SERVICE_NAME} and its operators from and against any claims, damages, obligations, losses, liabilities, costs, and expenses (including reasonable legal fees) arising from: (a) your use of the service; (b) your User Content; (c) your violation of these Terms; or (d) your violation of any third party's rights, including intellectual property or privacy rights.
          </p>

          <h2>13. Account Termination</h2>
          <p>
            You may delete your account at any time from your Profile page. On deletion, your recipes and personal data will be permanently removed from our active systems within 30 days, subject to retention obligations described in our Privacy Policy.
          </p>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or without notice, for any reason, including but not limited to violation of these Terms, suspected fraudulent or harmful activity, or extended inactivity. We will endeavour to give advance notice where practicable, except where doing so would be harmful or unlawful.
          </p>
          <p>
            Upon termination, your right to use the service ceases immediately. We are not liable to you or any third party for termination of your account.
          </p>

          <h2>14. Service Availability</h2>
          <p>
            We do not guarantee that the service will be available at any particular time or that it will be free from interruptions, errors, or security vulnerabilities. We may suspend, modify, or discontinue any part of the service at any time without notice. We are not liable for any loss arising from unavailability of the service.
          </p>

          <h2>15. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. When we do, we will update the effective date at the top of this page. For material changes, we will provide reasonable notice, such as a notification within the app or an email to your registered address. Your continued use of the service after any changes constitutes your acceptance of the new Terms. If you do not agree to the revised Terms, you must stop using the service and may delete your account.
          </p>

          <h2>16. Governing Law and Disputes</h2>
          <p>
            These Terms and any dispute arising out of or in connection with them or the service shall be governed by and construed in accordance with the laws of England and Wales. Subject to any applicable consumer protection rights, you and {SERVICE_NAME} agree to submit to the exclusive jurisdiction of the courts of England and Wales for the resolution of any disputes.
          </p>
          <p>
            Nothing in these Terms limits any rights you may have under applicable consumer protection legislation in your country of residence.
          </p>

          <h2>17. General</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall remain in full force. Our failure to enforce any right under these Terms does not constitute a waiver of that right. These Terms constitute the entire agreement between you and {SERVICE_NAME} with respect to the service and supersede all prior agreements.
          </p>

          <h2>18. Contact</h2>
          <p>
            Questions about these Terms? Please get in touch at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <div className={styles.footer}>
            <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
            <Link to="/" className={styles.footerLink}>← Back to Pantry</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
