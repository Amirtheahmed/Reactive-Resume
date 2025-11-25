// apps/client/src/pages/meta/extension-privacy-policy/page.tsx

import { t, Trans } from "@lingui/macro";
import { Helmet } from "react-helmet-async";

export const ExtensionPrivacyPolicyPage = () => {
  return (
    <>
      <Helmet>
        <title>
          {t`Copilot Privacy Policy`} - {t`Reactive Resume`}
        </title>
      </Helmet>

      <main className="container mx-auto max-w-3xl py-12">
        <div className="prose prose-zinc max-w-none dark:prose-invert">
          <h1>
            <Trans>Privacy Policy for Reactive Resume Copilot</Trans>
          </h1>
          <p>
            <em>
              <Trans>Last Updated: November 25, 2025</Trans>
            </em>
          </p>

          <h2>
            <Trans>Introduction</Trans>
          </h2>
          <p>
            <Trans>
              Welcome to Reactive Resume Copilot. This browser extension is designed to be your
              smart assistant for job applications, acting as a bridge between your Reactive Resume
              account and job boards across the web. Our commitment to your privacy is fundamental.
              This policy outlines what data the extension handles and how it's used.
            </Trans>
          </p>

          <h2>
            <Trans>The "Single Purpose" Principle</Trans>
          </h2>
          <p>
            <Trans>
              The Copilot has one clear purpose: to streamline your job application process. It
              achieves this through two primary functions:
            </Trans>
          </p>
          <ul>
            <li>
              <Trans>
                <strong>Context-Aware Content Generation:</strong> Analyzing a job description from
                your active tab to generate a tailored resume or cover letter.
              </Trans>
            </li>
            <li>
              <Trans>
                <strong>Intelligent Autofill:</strong> Filling out job application forms using the
                data from your Reactive Resume Information Bank.
              </Trans>
            </li>
          </ul>

          <h2>
            <Trans>Information We Handle</Trans>
          </h2>
          <p>
            <Trans>
              To provide these features, the extension needs to handle specific pieces of
              information. We do this with maximum respect for your privacy and only upon your
              explicit action.
            </Trans>
          </p>
          <ol>
            <li>
              <p>
                <strong>Authentication Information (API Key):</strong>
              </p>
              <p>
                <Trans>
                  To connect to your account, you must provide an API Key generated from your
                  Reactive Resume dashboard. This key is stored securely on your local machine using
                  the sandboxed `chrome.storage.local` API. It is never transmitted to any third
                  party other than the Reactive Resume server for authentication.
                </Trans>
              </p>
            </li>
            <li>
              <p>
                <strong>Your Professional Information (from Reactive Resume):</strong>
              </p>
              <p>
                <Trans>
                  For the autofill feature, the extension fetches your "Information Bank" data
                  (which includes personally identifiable information like your name, email, and
                  work history) from your Reactive Resume account. This data is handled in-memory
                  and is used locally by the content script to fill form fields. It is not stored
                  persistently within the extension.
                </Trans>
              </p>
            </li>
            <li>
              <p>
                <strong>Website Content (from Your Active Tab):</strong>
              </p>
              <p>
                <Trans>
                  When you click "Analyze Job Page," the extension reads the text content of your
                  current page to extract the job description. This text is sent to the Reactive
                  Resume server to generate tailored documents. This action is user-initiated, and
                  the content is not stored after the generation process is complete.
                </Trans>
              </p>
            </li>
          </ol>

          <h2>
            <Trans>How We Use Your Information</Trans>
          </h2>
          <ul>
            <li>
              <Trans>
                <strong>To Authenticate:</strong> Your API Key is used solely to securely connect to
                your Reactive Resume account.
              </Trans>
            </li>
            <li>
              <Trans>
                <strong>To Generate Content:</strong> Your Information Bank data and the scraped job
                description are sent to our server to be processed by an AI model, creating a new
                resume or cover letter.
              </Trans>
            </li>
            <li>
              <Trans>
                <strong>To Autofill Forms:</strong> Your Information Bank data is used by a local,
                on-device engine to identify and fill out forms on your active page.
              </Trans>
            </li>
          </ul>

          <h2>
            <Trans>Third-Party Services</Trans>
          </h2>
          <p>
            <Trans>
              The extension communicates with the Reactive Resume server. When using AI features,
              our server, in turn, sends the relevant data (your anonymized professional information
              and the job description) to a third-party AI provider (like OpenAI, Google Gemini,
              etc.) that you have configured in your account. We do not share more data than is
              necessary to fulfill the generation request.
            </Trans>
          </p>

          <h2>
            <Trans>Your Control and Rights</Trans>
          </h2>
          <p>
            <Trans>You have complete control over your data:</Trans>
          </p>
          <ul>
            <li>
              <Trans>
                You can revoke the extension's access at any time by deleting the API key from your
                Reactive Resume dashboard under Settings {">"} Developer.
              </Trans>
            </li>
            <li>
              <Trans>
                Uninstalling the extension will permanently delete the API key stored on your
                device.
              </Trans>
            </li>
            <li>
              <Trans>
                All your professional data is managed through your main Reactive Resume account.
              </Trans>
            </li>
          </ul>

          <h2>
            <Trans>Policy Disclosures</Trans>
          </h2>
          <p>
            <Trans>
              We certify that we adhere to the Chrome Web Store Developer Program Policies:
            </Trans>
          </p>
          <ul>
            <li>
              <Trans>
                We do not sell or transfer user data to third parties outside of the approved use
                cases (e.g., sending data to an AI provider for generation).
              </Trans>
            </li>
            <li>
              <Trans>
                We do not use or transfer user data for purposes unrelated to the extension's single
                purpose of assisting in job applications.
              </Trans>
            </li>
            <li>
              <Trans>
                We do not use or transfer user data to determine creditworthiness or for lending
                purposes.
              </Trans>
            </li>
          </ul>

          <h2>
            <Trans>Contact Us</Trans>
          </h2>
          <p>
            <Trans>
              If you have any questions about this privacy policy, please contact us at{" "}
              <a href="mailto:amirtheahmed@gmail.com">amirtheahmed@gmail.com</a>.
            </Trans>
          </p>
        </div>
      </main>
    </>
  );
};
