import LegalDocumentPage, {
  type LegalDocumentItem,
} from "@/components/LegalDocumentPage";

const items: LegalDocumentItem[] = [
  {
    type: "heading",
    number: "1",
    text: "Payment Processor and Merchant of Record",
  },
  {
    type: "paragraph",
    text: "Subscriptions to the AB3 Activity Library are sold and processed by Paddle, which acts as the Merchant of Record and authorized reseller for our digital service. Paddle is responsible for processing payments, issuing transaction receipts, calculating and collecting applicable sales taxes, handling billing inquiries, and processing refunds. Purchases are also subject to Paddle’s applicable Buyer Terms and refund policies.",
  },
  {
    type: "heading",
    number: "2",
    text: "Subscription Plans",
  },
  {
    type: "paragraph",
    text: "The AB3 Activity Library is offered through automatically renewing subscription plans, including:",
  },
  {
    type: "bullets",
    items: [
      "Monthly subscription: $1.99 per month",
      "Annual subscription: $14.99 per year",
    ],
  },
  {
    type: "paragraph",
    text: "Any applicable taxes may be added to the displayed subscription price based on the customer’s location. Subscriptions renew automatically unless canceled before the next scheduled renewal date.",
  },
  {
    type: "heading",
    number: "3",
    text: "Refunds",
  },
  {
    type: "paragraph",
    text: "All purchases of AB3 Activity Library subscriptions are made from Paddle, which acts as the Merchant of Record and authorized reseller. Refund requests are handled by Paddle in accordance with Paddle’s Buyer Terms, refund policies, and applicable consumer-protection laws.",
  },
  {
    type: "paragraph",
    text: "Customers may request a refund through Paddle’s buyer-support service or through the support or transaction-management link included in their Paddle receipt. Paddle determines whether a refund is approved and processes any approved refund to the original payment method when possible.",
  },
  {
    type: "paragraph",
    text: "Nothing in this policy limits any cancellation, withdrawal, refund, or other consumer right available under applicable law.",
  },
  {
    type: "heading",
    number: "4",
    text: "Cancellations",
  },
  {
    type: "paragraph",
    text: "Customers may cancel a subscription at any time through the subscription-management link provided by Paddle or through the AB3 Activity Library billing portal when available. Unless otherwise required by law, cancellation takes effect at the end of the current paid billing period, and access continues until that date.",
  },
  {
    type: "paragraph",
    text: "Cancellation prevents future renewal charges. Any request for a refund of a previous payment will be handled by Paddle under Paddle’s Buyer Terms and refund policies. Deleting the application, ceasing to use the service, or deleting locally stored files does not automatically cancel a subscription.",
  },
  {
    type: "heading",
    number: "5",
    text: "Technical Support",
  },
  {
    type: "paragraph",
    text: "Customers experiencing a technical problem may contact us at Support@ab3soccer.com. Please include:",
  },
  {
    type: "bullets",
    items: [
      "The email address associated with the account;",
      "A description of the problem;",
      "The device and browser being used;",
      "The date the problem occurred; and",
      "Screenshots or error messages, when available.",
    ],
  },
  {
    type: "paragraph",
    text: "Technical-support assistance is separate from Paddle’s review and processing of refund requests.",
  },
  {
    type: "heading",
    number: "6",
    text: "How to Request a Refund",
  },
  {
    type: "paragraph",
    text: "Customers may request a refund by:",
  },
  {
    type: "bullets",
    items: [
      "Using the support or transaction-management link included in the Paddle receipt or subscription confirmation email;",
      "Contacting Paddle’s buyer-support service; or",
      "Emailing Support@ab3soccer.com for assistance locating the appropriate Paddle support channel.",
    ],
  },
  {
    type: "paragraph",
    text: "Paddle may request information needed to identify and review the transaction. Customers should not send full payment-card information by email.",
  },
  {
    type: "heading",
    number: "7",
    text: "Refund Processing",
  },
  {
    type: "paragraph",
    text: "Refunds approved by Paddle are processed by Paddle to the original payment method whenever possible. The time required for a refund to appear may depend on Paddle, the payment method, the customer’s bank, and the customer’s country. AB3 does not control how quickly a bank or card issuer posts an approved refund.",
  },
  {
    type: "heading",
    number: "8",
    text: "Chargebacks",
  },
  {
    type: "paragraph",
    text: "Customers are encouraged to contact Paddle or AB3 before submitting a payment dispute or chargeback so that the transaction can be reviewed. Fraudulent or abusive chargebacks may result in suspension or termination of the associated AB3 account. This section does not restrict a customer’s lawful right to dispute an unauthorized or incorrect charge.",
  },
  {
    type: "heading",
    number: "9",
    text: "Changes to This Policy",
  },
  {
    type: "paragraph",
    text: "We may update this Refund Policy from time to time. The updated version will be posted on our website with a revised “Last Updated” date. Changes will not reduce any consumer right that cannot legally be waived.",
  },
  {
    type: "heading",
    number: "10",
    text: "Contact Information",
  },
  {
    type: "paragraph",
    text: "AB3 Analytics, LLC Email: Support@ab3soccer.com Mailing Address: 9709 N Kentucky Ave Kansas City, MO 64157",
  },
];

export default function Page() {
  return (
    <LegalDocumentPage
      eyebrow="Billing & Subscriptions"
      title="AB3 Activity Library Refund Policy"
      effectiveDate="July 23, 2026"
      lastUpdated="July 26, 2026"
      introduction="This Refund Policy applies to subscriptions for the AB3 Activity Library, a digital software service provided by AB3 Analytics, LLC (“AB3,” “we,” “us,” or “our”)."
      items={items}
    />
  );
}
