import Link from 'next/link';
import { APP_NAME, SITE_URL, EFFECTIVE_DATE, CONTACT_EMAIL } from '../../lib/legal';
import styles from '../legal.module.css';

export const metadata = {
  title: `Privacy Policy · ${APP_NAME}`,
  description: `How ${APP_NAME} handles your information.`,
};

// Written to match what the app actually does. When a feature changes what is
// collected or where it goes (e.g. chat history moving to the server, or
// billing), update this page and EFFECTIVE_DATE in lib/legal.js.
export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.meta}>Effective {EFFECTIVE_DATE} · {SITE_URL}</p>

      <div className={styles.summary}>
        <strong>The short version:</strong> we keep your Google name, email and profile picture so
        you can sign in. Your chats, memory notes and settings stay in your own browser, not on our
        servers. To answer you, your messages are sent to the AI company that runs the model you
        picked. We don&apos;t sell your data and we don&apos;t run ads.
      </div>

      <h2>1. Who we are</h2>
      <p>
        {APP_NAME} (&quot;we&quot;, &quot;us&quot;) is an AI chat app with configurable personalities,
        run by an independent developer. This policy explains what information the app handles,
        where it goes, and the choices you have.
      </p>

      <h2>2. What we store about you</h2>
      <p>When you sign in with Google, we save one record about you in our database:</p>
      <ul>
        <li>your name, email address and profile picture, as provided by Google;</li>
        <li>Google&apos;s permanent ID for your account, which is how we recognise you next time;</li>
        <li>your plan (for example &quot;Free&quot;), when you first signed in, and when you last signed in.</li>
      </ul>
      <p>
        <strong>We never see or store your Google password.</strong> Google handles the sign-in and
        only tells us who you are.
      </p>

      <h2>3. What stays on your device</h2>
      <p>
        These are kept in your browser&apos;s own storage on your phone or computer, not on our
        servers: your chat history, the notes you ask the AI to remember, your persona and model
        choices, voice and voice-tuning settings, and your 18+ confirmation. Clearing your
        browser&apos;s data for this site deletes them, and they don&apos;t follow you to another device.
      </p>

      <h2>4. Where your messages go</h2>
      <p>
        To reply to you, the app sends your message, the recent conversation, your remembered notes
        and your persona settings to the company that runs the AI model you selected. We pass these
        through; we don&apos;t save the content of your chats on our servers. Each company handles
        the data under its own privacy policy:
      </p>
      <ul>
        <li><strong>Groq</strong>: runs most chat models, and turns your voice recordings into text on iPhone Home Screen installs.</li>
        <li><strong>Google (Gemini)</strong>: runs the Gemini chat models and the Google voice that reads replies aloud.</li>
        <li>
          <strong>Your browser&apos;s speech recognition</strong>: on most devices, voice input uses
          the speech service built into your browser (run by Apple or Google), under that
          company&apos;s terms.
        </li>
        <li>
          <strong>ElevenLabs, OpenAI, Groq (Orpheus) and Hugging Face (Qwen)</strong>: premium voices
          used only by the app owner, not by regular users.
        </li>
      </ul>
      <p>
        The app also relies on <strong>Google</strong> for sign-in, <strong>Vercel</strong> to host
        the site, and <strong>Neon</strong> to host the database in section 2. Like any website,
        Vercel briefly keeps standard technical logs (such as IP address and the pages requested) to
        run and protect the service.
      </p>

      <h2>5. Cookies and similar storage</h2>
      <ul>
        <li>A sign-in cookie that keeps you signed in. It is encrypted, and only our server can read it.</li>
        <li>An owner-only cookie that unlocks the premium voices for the app owner.</li>
        <li>An offline copy of the app&apos;s public pages, so it opens quickly when you add it to your Home Screen.</li>
      </ul>
      <p>We don&apos;t use advertising or third-party tracking cookies.</p>

      <h2>6. What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t sell or rent your personal information.</li>
        <li>We don&apos;t show ads or share your information with advertisers.</li>
        <li>We don&apos;t use your conversations to train our own AI models.</li>
      </ul>

      <h2>7. Keeping and deleting your information</h2>
      <p>
        We keep your account record (section 2) until you ask us to delete it. To delete it, contact
        us using the details below and we will remove it. Your on-device data (section 3) you can
        delete yourself at any time by clearing this site&apos;s data in your browser.
      </p>

      <h2>8. Adults only</h2>
      <p>
        {APP_NAME} is for people aged 18 and over. We don&apos;t knowingly collect information from
        anyone under 18. If you believe someone under 18 has signed in, contact us and we will delete
        their account.
      </p>

      <h2>9. Security</h2>
      <p>
        Connections to the app are encrypted (HTTPS), secret keys stay on our servers, and sign-in is
        handled by Google. No system is perfectly secure, but we work to protect the little we store.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        If we change what we collect or how we use it, we will update this page and the effective
        date at the top. Significant changes will be pointed out in the app.
      </p>

      <h2>11. Contact</h2>
      <p>
        {CONTACT_EMAIL
          ? <>Questions or deletion requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>
          : <>A contact address for privacy questions and deletion requests is coming soon.</>}
      </p>

      <p>See also our <Link href="/terms">Terms of Service</Link>.</p>
    </main>
  );
}
