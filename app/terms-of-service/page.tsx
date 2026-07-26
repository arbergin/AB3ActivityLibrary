import LegalDocumentPage, {
  type LegalDocumentItem,
} from "@/components/LegalDocumentPage";

const items: LegalDocumentItem[] = [
  {
    "type": "heading",
    "number": "1",
    "text": "The Service"
  },
  {
    "type": "paragraph",
    "text": "The AB3 Activity Library is a digital software service designed to help soccer coaches and other authorized users:"
  },
  {
    "type": "bullets",
    "items": [
      "Create soccer activity diagrams;",
      "Create multi-frame activity animations;",
      "Add activity details, rules, notes, and coaching points;",
      "Categorize and organize activities;",
      "Search for saved activities;",
      "Import and export supported content;",
      "Share activities according to selected visibility settings; and",
      "Use supported synchronization features with AB3 applications."
    ]
  },
  {
    "type": "paragraph",
    "text": "We may add, change, suspend, or discontinue features at any time."
  },
  {
    "type": "heading",
    "number": "2",
    "text": "Eligibility"
  },
  {
    "type": "paragraph",
    "text": "You must be at least 18 years old and legally capable of entering into a binding agreement to create a paid account. The service is not intended for account registration by children under 13. If you use the service on behalf of a club, company, school, team, or other organization, you represent that you are authorized to accept these Terms on its behalf."
  },
  {
    "type": "heading",
    "number": "3",
    "text": "Accounts"
  },
  {
    "type": "paragraph",
    "text": "You agree to provide accurate and current account information. You are responsible for:"
  },
  {
    "type": "bullets",
    "items": [
      "Maintaining the confidentiality of your password;",
      "Controlling access to your account;",
      "Activities performed through your account;",
      "Keeping your email address current; and",
      "Promptly reporting suspected unauthorized access.",
      "Share an individual account with unauthorized users;",
      "Impersonate another person;",
      "Create an account using false information;",
      "Transfer or sell an account without our permission; or",
      "Use another person’s account without authorization."
    ]
  },
  {
    "type": "paragraph",
    "text": "You may not:"
  },
  {
    "type": "paragraph",
    "text": "We may require email verification or other reasonable account-verification measures."
  },
  {
    "type": "heading",
    "number": "4",
    "text": "Subscriptions"
  },
  {
    "type": "paragraph",
    "text": "Access to some or all features requires a paid subscription. Available plans may include:"
  },
  {
    "type": "bullets",
    "items": [
      "Monthly subscription: $1.99 per month; and",
      "Annual subscription: $14.99 per year."
    ]
  },
  {
    "type": "paragraph",
    "text": "Prices may be displayed exclusive or inclusive of taxes depending on location and checkout presentation. We may change subscription prices in the future. Price changes will apply according to applicable law and any notice provided at the time."
  },
  {
    "type": "heading",
    "number": "5",
    "text": "Paddle as Merchant of Record"
  },
  {
    "type": "paragraph",
    "text": "Paid subscriptions are sold and processed by Paddle, which acts as Merchant of Record and authorized reseller. When you purchase a subscription, the payment transaction is between you and Paddle, subject to Paddle’s applicable buyer terms, privacy notice, and refund policy. Paddle may process:"
  },
  {
    "type": "bullets",
    "items": [
      "Payments;",
      "Taxes;",
      "Receipts;",
      "Subscription renewals;",
      "Cancellations;",
      "Refunds;",
      "Payment disputes; and",
      "Billing-support requests."
    ]
  },
  {
    "type": "paragraph",
    "text": "If these Terms conflict with Paddle’s mandatory buyer terms regarding the payment transaction, Paddle’s applicable buyer terms control for that transaction."
  },
  {
    "type": "heading",
    "number": "6",
    "text": "Automatic Renewal"
  },
  {
    "type": "paragraph",
    "text": "Subscriptions automatically renew for successive billing periods unless canceled before the applicable renewal date. By purchasing a subscription, you authorize Paddle to charge the selected payment method for:"
  },
  {
    "type": "bullets",
    "items": [
      "The initial subscription;",
      "Recurring renewal charges;",
      "Applicable taxes; and",
      "Any other amounts clearly disclosed and authorized."
    ]
  },
  {
    "type": "paragraph",
    "text": "You are responsible for canceling before renewal when you no longer want the subscription."
  },
  {
    "type": "heading",
    "number": "7",
    "text": "Cancellation"
  },
  {
    "type": "paragraph",
    "text": "You may cancel through the available subscription-management or customer-portal feature. Unless otherwise stated or required by law:"
  },
  {
    "type": "bullets",
    "items": [
      "Cancellation takes effect at the end of the current paid billing period;",
      "Access continues through the paid-through date;",
      "No future renewal will be charged after cancellation is effective; and",
      "Cancellation does not automatically entitle you to a refund."
    ]
  },
  {
    "type": "paragraph",
    "text": "Deleting the application, deleting content, or stopping use of the service does not automatically cancel a subscription."
  },
  {
    "type": "heading",
    "number": "8",
    "text": "Refunds"
  },
  {
    "type": "paragraph",
    "text": "Refund requests are governed by:"
  },
  {
    "type": "bullets",
    "items": [
      "The AB3 Activity Library Refund Policy;",
      "Paddle’s applicable buyer terms and refund policy; and",
      "Mandatory consumer-protection laws."
    ]
  },
  {
    "type": "paragraph",
    "text": "Approved refunds are normally issued through Paddle to the original payment method."
  },
  {
    "type": "heading",
    "number": "9",
    "text": "Payment Failures"
  },
  {
    "type": "paragraph",
    "text": "If a payment fails or a subscription becomes past due, we may:"
  },
  {
    "type": "bullets",
    "items": [
      "Notify you;",
      "Display a billing warning;",
      "Allow a limited grace period;",
      "Restrict account functionality;",
      "Make the account read-only;",
      "Suspend paid features; or",
      "Terminate access after the applicable subscription period or payment-recovery process ends."
    ]
  },
  {
    "type": "paragraph",
    "text": "Restoring payment does not guarantee restoration of content that was independently deleted under an applicable retention policy."
  },
  {
    "type": "heading",
    "number": "10",
    "text": "Limited License"
  },
  {
    "type": "paragraph",
    "text": "Subject to these Terms and payment of applicable fees, AB3 grants you a limited, nonexclusive, nontransferable, non-sublicensable, revocable license to access and use the service for lawful personal or internal professional purposes. You may use exported activity materials in your own coaching, instructional, planning, and team-management activities. You may not:"
  },
  {
    "type": "bullets",
    "items": [
      "Copy or reproduce the service’s source code;",
      "Reverse engineer the service except where law expressly permits;",
      "Resell or sublicense access;",
      "Operate the service as a competing hosted product;",
      "Circumvent access, payment, or security controls;",
      "Scrape or systematically extract content;",
      "Use automated systems in a manner that burdens the service;",
      "Remove proprietary notices; or",
      "Use AB3 branding without authorization."
    ]
  },
  {
    "type": "heading",
    "number": "11",
    "text": "AB3 Intellectual Property"
  },
  {
    "type": "paragraph",
    "text": "The service and its underlying software, interface, design, code, graphics, logos, trademarks, documentation, and original materials are owned by AB3 Analytics, LLC or its licensors. Except for the limited license granted in these Terms, no ownership right is transferred to you. “AB3,” the AB3 logos, AB3 Activity Library, AB3 Activity Planner, and related branding may not be used without written permission."
  },
  {
    "type": "heading",
    "number": "12",
    "text": "User Content"
  },
  {
    "type": "paragraph",
    "text": "“User Content” means diagrams, activities, text, files, images, animations, metadata, and other material submitted or created by a user. As between you and AB3, you retain ownership of your original User Content. You grant AB3 a nonexclusive, worldwide, royalty-free license to host, store, reproduce, process, format, transmit, display, and otherwise use User Content solely as reasonably necessary to:"
  },
  {
    "type": "bullets",
    "items": [
      "Operate the service;",
      "Provide requested sharing and visibility features;",
      "Generate previews and exports;",
      "Synchronize supported content;",
      "Back up and secure data;",
      "Provide support;",
      "Prevent misuse; and",
      "Improve service reliability."
    ]
  },
  {
    "type": "paragraph",
    "text": "This license ends when the User Content is deleted from our active systems, except to the extent copies remain temporarily in backups, logs, legal records, or systems where retention is reasonably necessary."
  },
  {
    "type": "heading",
    "number": "13",
    "text": "Responsibility for User Content"
  },
  {
    "type": "paragraph",
    "text": "You represent that:"
  },
  {
    "type": "bullets",
    "items": [
      "You own or have permission to use your User Content;",
      "Uploading or sharing it does not violate another person’s rights;",
      "It does not unlawfully disclose confidential information;",
      "It complies with applicable law; and",
      "You have any necessary permission concerning player or minor information."
    ]
  },
  {
    "type": "paragraph",
    "text": "You are responsible for determining whether your club, employer, league, school, client, or other organization allows its training materials to be uploaded or shared. Do not upload proprietary or confidential club materials unless you are authorized to do so."
  },
  {
    "type": "heading",
    "number": "14",
    "text": "Sharing and Visibility"
  },
  {
    "type": "paragraph",
    "text": "The service may offer settings such as:"
  },
  {
    "type": "bullets",
    "items": [
      "Private;",
      "My Club; and",
      "Everyone."
    ]
  },
  {
    "type": "paragraph",
    "text": "You are responsible for selecting the appropriate visibility setting. Content made available through a shared setting may be viewed, copied, downloaded, or used by other authorized users. We cannot guarantee that another user will not retain a copy after access is removed."
  },
  {
    "type": "heading",
    "number": "15",
    "text": "Acceptable Use"
  },
  {
    "type": "paragraph",
    "text": "You may not use the service to:"
  },
  {
    "type": "bullets",
    "items": [
      "Violate any law or regulation;",
      "Infringe copyrights, trademarks, privacy rights, publicity rights, or other rights;",
      "Upload malware or harmful code;",
      "Attempt unauthorized access;",
      "Interfere with service operation;",
      "Harass, threaten, exploit, or deceive another person;",
      "Publish unlawful, abusive, hateful, or sexually exploitative content;",
      "Collect information about others without authorization;",
      "Upload sensitive information unnecessarily;",
      "Facilitate fraud;",
      "Misrepresent affiliation with AB3;",
      "Bypass subscription restrictions;",
      "Share login credentials to avoid paying applicable fees; or",
      "Use the service in a way that creates unreasonable security, legal, or operational risk."
    ]
  },
  {
    "type": "heading",
    "number": "16",
    "text": "Content Concerning Minors"
  },
  {
    "type": "paragraph",
    "text": "The service is designed primarily for use by adult coaches and administrators. Users must exercise particular care when entering information about minor athletes. Unless necessary and legally authorized, do not include:"
  },
  {
    "type": "bullets",
    "items": [
      "A child’s full legal name;",
      "Home address;",
      "Personal email address;",
      "Telephone number;",
      "Health information;",
      "School schedule;",
      "Precise location information; or",
      "Other sensitive identifying information."
    ]
  },
  {
    "type": "paragraph",
    "text": "You are responsible for obtaining any required parental, guardian, club, school, or organizational permission."
  },
  {
    "type": "heading",
    "number": "17",
    "text": "Coaching and Safety Disclaimer"
  },
  {
    "type": "paragraph",
    "text": "The AB3 Activity Library is an activity-planning and organization tool. It does not provide medical, legal, safeguarding, licensing, or professional-risk advice. You are solely responsible for:"
  },
  {
    "type": "bullets",
    "items": [
      "Evaluating whether an activity is appropriate;",
      "Adjusting activities for player age and ability;",
      "Providing qualified supervision;",
      "Inspecting facilities and equipment;",
      "Following league, club, and governing-body rules;",
      "Following concussion and emergency protocols;",
      "Protecting player welfare; and",
      "Obtaining required consent."
    ]
  },
  {
    "type": "paragraph",
    "text": "Use of an activity from the service does not guarantee safety, player development, competitive success, or any particular outcome."
  },
  {
    "type": "heading",
    "number": "18",
    "text": "Availability and Changes"
  },
  {
    "type": "paragraph",
    "text": "We aim to provide a reliable service but do not guarantee uninterrupted or error-free access. The service may be unavailable because of:"
  },
  {
    "type": "bullets",
    "items": [
      "Maintenance;",
      "Updates;",
      "Internet or hosting failures;",
      "Security incidents;",
      "Third-party outages;",
      "Legal requirements; or",
      "Events beyond our reasonable control."
    ]
  },
  {
    "type": "paragraph",
    "text": "We may modify or remove features, provided that we comply with applicable legal obligations concerning paid subscriptions."
  },
  {
    "type": "heading",
    "number": "19",
    "text": "Third-Party Services"
  },
  {
    "type": "paragraph",
    "text": "The service may integrate with or depend on third parties, including payment, authentication, hosting, storage, email, and infrastructure providers. We are not responsible for a third party’s independent products, terms, privacy practices, outages, or actions."
  },
  {
    "type": "heading",
    "number": "20",
    "text": "Suspension and Termination"
  },
  {
    "type": "paragraph",
    "text": "We may suspend or terminate access when:"
  },
  {
    "type": "bullets",
    "items": [
      "You violate these Terms;",
      "Payment remains overdue;",
      "Fraud or abuse is suspected;",
      "Your use creates a security or legal risk;",
      "You attempt to bypass restrictions;",
      "We are legally required to act; or",
      "The service is discontinued."
    ]
  },
  {
    "type": "paragraph",
    "text": "Where reasonable, we may provide notice and an opportunity to correct the issue. Serious violations may result in immediate suspension. You may stop using the service at any time. Ending use does not automatically cancel a paid subscription."
  },
  {
    "type": "heading",
    "number": "21",
    "text": "Effect of Termination"
  },
  {
    "type": "paragraph",
    "text": "After subscription expiration or termination, we may:"
  },
  {
    "type": "bullets",
    "items": [
      "Restrict editing and creation;",
      "Make the account read-only;",
      "Restrict exports or synchronization;",
      "Allow resubscription;",
      "Retain content for a limited period; or",
      "Delete content according to our retention practices."
    ]
  },
  {
    "type": "paragraph",
    "text": "You should export important materials before your access ends. Sections that by their nature should survive termination will survive, including intellectual-property, disclaimer, liability, indemnification, dispute, and payment provisions."
  },
  {
    "type": "heading",
    "number": "22",
    "text": "Disclaimers"
  },
  {
    "type": "paragraph",
    "text": "TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” AB3 DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF:"
  },
  {
    "type": "bullets",
    "items": [
      "MERCHANTABILITY;",
      "FITNESS FOR A PARTICULAR PURPOSE;",
      "TITLE;",
      "NON-INFRINGEMENT;",
      "ACCURACY;",
      "AVAILABILITY; AND",
      "ERROR-FREE OPERATION.",
      "The service will always be available;",
      "Every defect will be corrected;",
      "Data will never be lost;",
      "Exports will work with every third-party application;",
      "User-created content is accurate;",
      "Shared activities are safe or suitable; or",
      "The service will meet every user’s needs."
    ]
  },
  {
    "type": "paragraph",
    "text": "We do not warrant that:"
  },
  {
    "type": "paragraph",
    "text": "Some jurisdictions do not permit certain warranty exclusions, so some exclusions may not apply to you."
  },
  {
    "type": "heading",
    "number": "23",
    "text": "Limitation of Liability"
  },
  {
    "type": "paragraph",
    "text": "TO THE MAXIMUM EXTENT PERMITTED BY LAW, AB3 ANALYTICS, LLC AND ITS OWNERS, OFFICERS, EMPLOYEES, CONTRACTORS, AND AFFILIATES WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING:"
  },
  {
    "type": "bullets",
    "items": [
      "LOSS OF DATA;",
      "LOSS OF REVENUE;",
      "LOSS OF PROFITS;",
      "LOSS OF GOODWILL;",
      "BUSINESS INTERRUPTION;",
      "LOSS OF OPPORTUNITY; OR",
      "COST OF SUBSTITUTE SERVICES."
    ]
  },
  {
    "type": "paragraph",
    "text": "TO THE MAXIMUM EXTENT PERMITTED BY LAW, AB3’S TOTAL LIABILITY ARISING FROM OR RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF:"
  },
  {
    "type": "numbered",
    "items": [
      "THE AMOUNT YOU PAID FOR THE SERVICE DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM; OR",
      "FIFTY U.S. DOLLARS."
    ]
  },
  {
    "type": "paragraph",
    "text": "These limitations do not apply where liability cannot legally be limited."
  },
  {
    "type": "heading",
    "number": "24",
    "text": "Indemnification"
  },
  {
    "type": "paragraph",
    "text": "To the extent permitted by law, you agree to defend, indemnify, and hold harmless AB3 Analytics, LLC and its owners, officers, employees, contractors, and affiliates from claims, liabilities, damages, judgments, losses, and reasonable expenses arising from:"
  },
  {
    "type": "bullets",
    "items": [
      "Your User Content;",
      "Your violation of these Terms;",
      "Your violation of law;",
      "Your infringement of another person’s rights;",
      "Your unauthorized disclosure of confidential information; or",
      "Your operation or supervision of a soccer activity."
    ]
  },
  {
    "type": "paragraph",
    "text": "This obligation does not apply to the extent a claim was caused by AB3’s own unlawful conduct."
  },
  {
    "type": "heading",
    "number": "25",
    "text": "Governing Law"
  },
  {
    "type": "paragraph",
    "text": "These Terms are governed by the laws of the State of Missouri, without regard to conflict-of-law principles. Any dispute not subject to a mandatory consumer forum will be brought in the state or federal courts located in Clay County, Missouri, and the parties consent to those courts’ jurisdiction. Consumers retain any mandatory rights and forums provided by the laws of their place of residence."
  },
  {
    "type": "heading",
    "number": "26",
    "text": "Changes to These Terms"
  },
  {
    "type": "paragraph",
    "text": "We may update these Terms periodically. The revised version will be posted with a new “Last Updated” date. For material changes, we may provide additional notice. Continued use after the effective date of an updated version constitutes acceptance to the extent permitted by law."
  },
  {
    "type": "heading",
    "number": "27",
    "text": "General Terms"
  },
  {
    "type": "paragraph",
    "text": "If any provision is held unenforceable, the remaining provisions remain effective. Our failure to enforce a provision is not a waiver. You may not assign these Terms without our written consent. We may assign them as part of a merger, acquisition, restructuring, financing, or sale of assets. These Terms, the Privacy Policy, the Refund Policy, and any applicable plan terms constitute the agreement between you and AB3 concerning the service, subject to Paddle’s separate terms governing payment transactions."
  },
  {
    "type": "heading",
    "number": "28",
    "text": "Contact Information"
  },
  {
    "type": "paragraph",
    "text": "AB3 Analytics, LLC Email: Support@ab3soccer.com Mailing Address: 9709 N Kentucky Ave Kansas City, MO 64157"
  }
];

export default function Page() {
  return (
    <LegalDocumentPage
      eyebrow="Terms & Conditions"
      title="AB3 Activity Library Terms of Service"
      effectiveDate="July 23, 2026"
      lastUpdated="July 23, 2026"
      introduction="These Terms of Service form a binding agreement between you and AB3 Analytics, LLC concerning your access to and use of the AB3 Activity Library. By creating an account, purchasing a subscription, accessing the service, or using the service, you agree to these Terms. If you do not agree, do not use the service."
      items={items}
    />
  );
}
