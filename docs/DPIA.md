# Data protection impact assessment, draft

Draft for review by privacy counsel. GDPR art. 35 requires a DPIA here: large scale processing of data about sex life (art. 9), new technology (end to end chat, forensic watermarks) and identity checks.

## 1. Processing
| Data | Purpose | Legal basis | Retention |
|---|---|---|---|
| Account: email, username, birth year, country | Running the account, VAT country | Contract | Life of the account |
| Requests, deals, content, reports | Running the marketplace, safety | Explicit consent (art. 9(2)(a)); legal obligation for reports passed to police | Content: vault period; deals: bookkeeping period |
| Chats | Communication between buyer and creator | Explicit consent; stored encrypted end to end, unreadable for ByRequest | 12 months after the deal |
| Buyer age check result | Protection of minors | Legal obligation (DSA art. 28) | Life of the account |
| Creator identity: legal name, date of birth, country (sealed) | Payments, safety, card network rules | Legal obligation and contract | Statutory period, to confirm |
| Tax details (sealed) | DAC7 reporting | Legal obligation | Statutory period, to confirm |
| Watermark marks per view | Tracing leaks | Legitimate interest of creators and people depicted | Life of the vault item |

## 2. Risks and measures
| Risk | Measure |
|---|---|
| Exposure of someone's sex life | Only username and avatar are public; neutral notifications and statement name; quick hide; no data sale |
| Minors | Age check for buyers, identity check for creators and everyone who appears |
| Non consensual content | Consent per delivery, review before availability, removal without account, re-upload block |
| Breach of identity or tax data | AES-256-GCM sealing, key outside the database, access only for admins with a logged purpose |
| Chat misuse that cannot be moderated | Device side warning, report with chosen messages, clear rules |
| Over retention | Scheduled purge, documented periods |

## 3. Still to do
Processor agreements with every provider, a records of processing register, a data protection officer, a breach procedure, and the final sign off.
