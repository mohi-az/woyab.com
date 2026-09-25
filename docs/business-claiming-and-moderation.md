# Business Claiming, Edit Suggestions, Moderation, and Public Removal

This document describes the implemented business ownership claiming, edit suggestion, moderation, and public removal system in WoYab.

---

## Overview

The business management system allows owners, employees, and customers to interact with a business page through clearly separated permission levels. Content changes are never published directly and must be reviewed by an administrator before they are applied.

### 1. Business ownership claiming

- The public “Edit Business” button presents Owner, Employee, and Customer options.
- A user selecting Owner must sign in before starting a claim.
- The claim form contains the full name, read-only account email, official business email, and an optional official link.
- The user must accept the Business Terms of Use and acknowledge the Privacy Notice. Acknowledging the Privacy Notice is not presented as optional GDPR consent.
- No phone number or unnecessary personal information is collected.
- The official email is normalized and its domain is validated through DNS. Gmail addresses are allowed.
- The optional evidence link must be a valid HTTPS URL. The server does not request the URL to establish ownership.

### 2. OTP email verification

- A six-digit OTP is created using a cryptographically secure generator.
- The OTP is sent only to the submitted official business email, not the user's account email.
- The raw OTP is never stored. Only its hash is persisted.
- Each OTP is valid for 10 minutes.
- Three incorrect attempts block the claim for 10 minutes.
- Resends have a minimum 60-second cooldown and a maximum of three sends within 30 minutes.
- Sending a new OTP invalidates the previous code.
- The email includes the business name, claimant name, OTP, and the required security warning.

### 3. Claim decision policy

- If the business has no owner and the verified email exactly matches the business's existing email, the claim is approved automatically.
- Automatic approval assigns the business owner and promotes the user to the Owner role.
- A new email address or Gmail address moves the verified claim to administrator review.
- A claim for a business that already has an owner can only be approved by an explicit administrator decision.
- Approving a competing claim requires a recorded reason, an audit entry, and notifications to the previous and new owners.
- No owner-facing ownership transfer API or user interface was added.

### 4. Edit suggestions

- Owners, employees, and customers can submit structured change requests.
- Requests can cover basic information, translations, category, contact details, address, location, opening hours, attributes, tags, and services.
- No submitted change is applied directly.
- The current business snapshot and `businessUpdatedAt` value are stored with each request.
- If the business changes before review, applying the request stops with `STALE_CHANGE_REQUEST` and requires another review.
- Administrators can inspect the before-and-after difference, approve and apply the request, or reject it with a reason.
- Approved changes are applied transactionally and recorded in the audit trail.

### 5. Services and menus

- Service management uses the existing `Service` model.
- Owners can request the creation, modification, or deactivation of a service.
- Service changes are applied only after administrator approval.
- Active services are displayed on the public business page.
- Image editing and uploads are outside this phase. Existing Google Places images remain unchanged.

### 6. Public removal and restoration

- The owner must enter the exact business name to confirm removal.
- Removal is implemented as a soft removal and does not change the business's commercial status.
- The business is immediately hidden from its public page, search results, map, and related public surfaces.
- Services, reviews, favorites, contact, view analytics, and business-bound images are no longer publicly accessible for a removed business.
- Direct visits to a removed business return a 404 response.
- The current owner or an administrator can restore the business.
- The following confirmation message is displayed:

> Your business has been removed from public view. You may restore it anytime.

- Soft removal is not described as erasure of personal data under GDPR Article 17. Personal-data erasure requests follow a separate legal review process.

### 7. API security

- The public Express business and service API surface is read-only.
- Unauthenticated public endpoints for directly creating, updating, or deleting businesses and services have been removed or blocked.
- Management mutations run only through Next.js server-side routes after Auth.js, ownership, or administrator-role checks.
- The Google Places photo endpoint is now business-bound so removed businesses and unrelated photo references cannot be exposed.
- Stable error codes cover authentication, invalid or expired OTPs, OTP blocking, email delivery failure, active claims, required owner review, stale requests, and removed businesses.

### 8. Authentication and safe return flow

- The existing Auth.js architecture remains in use.
- Manual sign-in and Google OAuth connected to Firebase are supported without creating a separate Firebase session.
- When a user is redirected to login or registration from a claim, a validated `callbackUrl` returns them to the same business page after authentication.

### 9. Privacy and data retention

- A claim-specific Privacy Notice is available in English, German, and Persian.
- The legal controller name, address, privacy email, supervisory authority, and notice version come from deployment configuration.
- Production fails fast when mandatory legal or Resend configuration is missing.
- Expired or cancelled claims become eligible for retention review and anonymization after 90 days.
- Rejected claims and closed change requests become eligible after 180 days.
- Approved claims are retained for the duration of ownership. After ownership ends, the standard three-year German limitation schedule is considered.
- An administrator Retention Review queue supports due-item review, anonymization, and reasoned, time-limited legal holds.
- Indefinite legal holds are not permitted.
- OTP hashes are cleared when a claim ends or expires.

### 10. Database and models

- `BusinessClaim` was expanded with complete claim statuses, OTP controls, verification fields, retention metadata, and auditing data.
- `BusinessChangeRequest` was added for requester identity and role, versioned payloads, snapshots, reviewer decisions, and audit timestamps.
- `removedAt`, `removedById`, and `restoredAt` were added to Business.
- A migration covering these changes was created and applied to the development database.
- Legacy claims with the `PENDING` status are migrated to `UNDER_REVIEW`.

### 11. Main added endpoints

- `POST /api/business-claims`
- `GET /api/business-claims/[id]`
- `POST /api/business-claims/[id]/verify`
- `POST /api/business-claims/[id]/resend`
- `POST /api/business-change-requests`
- `POST /api/businesses/[id]/remove`
- `POST /api/businesses/[id]/restore`

### 12. Completed technical verification

- Prisma schema validation and Prisma Client generation passed.
- The migration was applied to the development database and Prisma migration status is current.
- Frontend and API TypeScript checks passed.
- Frontend and API ESLint checks passed.
- All newly added claim-policy and public-API regression tests passed.
- The production build passed.
- English, German, and Persian translation files parsed successfully.
- `git diff --check` passed, with only the normal Windows LF/CRLF warnings.
- Existing cookie and privacy worktree changes were preserved and merged with the new implementation.

### 13. Requirements before production release

- Configure the Resend API key and verified sender addresses in the production environment.
- Complete the controller name, address, privacy email, supervisory authority, and Privacy Notice version.
- Define a secure `CRON_SECRET` and schedule the claim maintenance job.
- Have German legal counsel review the Privacy Notice and retention schedule before release.
- This implementation provides technical controls and does not by itself guarantee complete legal compliance.
