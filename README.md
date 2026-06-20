# AI Content Moderation Platform

![Platform Header Placeholder](./docs/images/header-placeholder.png)

## 1. Project Overview

### The Business Problem
As digital platforms scale, user-generated content (UGC) grows exponentially. Manual moderation teams cannot keep pace with the volume of images uploaded daily, leading to delayed content publishing or, worse, prolonged exposure to explicit, violent, or policy-violating content. 

### Why AI Content Moderation Matters
Traditional moderation systems rely heavily on reactive reporting (users flagging content) or massive teams of human reviewers scrolling through queues. Both approaches are slow, expensive, and subject to human bias and fatigue. AI moderation matters because it shifts the paradigm from *reactive* to *proactive*, analyzing content at ingestion in milliseconds.

### The Platform Solution
This platform is a production-ready, full-stack AI content moderation system. It acts as an automated triage layer: intercepting submissions, executing vision-model analysis, evaluating results against dynamic administrative policies, and automatically rendering verdicts. Human intervention is reserved strictly for edge cases and user appeals, drastically reducing operational overhead while ensuring platform safety.

---

## 2. System Architecture

The system is built on a decoupled, service-oriented architecture utilizing modern, typed stacks on both ends of the wire.

### Frontend
* **Next.js 15 (App Router):** Chosen for its hybrid rendering capabilities (Server Components + Client Components) and optimal routing performance.
* **TypeScript:** Enforces strict type definitions mapped directly from the backend DTOs.
* **Tailwind CSS v4 & shadcn/ui:** Provides a headless, highly customizable, and accessible component foundation.
* **TanStack Query:** Manages server state, handles aggressive caching, and implements optimistic UI updates for instantaneous feedback during moderation actions.

### Backend
* **Node.js & Express:** Lightweight, unopinionated routing layer optimized for I/O operations.
* **MongoDB & Mongoose:** A NoSQL database is ideal here due to the highly dynamic nature of metadata, AI result schemas, and variable policy structures.
* **TypeScript:** Ensures end-to-end type safety, from database schemas to API responses.

### AI Layer
* **Gemini Vision (Current):** Utilized for its state-of-the-art multimodal analysis and zero-shot categorization capabilities.
* **Provider Abstraction:** The integration is abstracted behind an `AIProvider` interface. This ensures the system is not vendor-locked; swapping Gemini for OpenAI's GPT-4V or Anthropic's Claude 3 requires implementing a single adapter class.

**Tradeoffs:** 
Opting for a monolithic Express backend over microservices was a conscious decision to increase development velocity and reduce deployment complexity. As the platform scales, the decoupled module design allows the `Moderation Engine` or `Verdict Engine` to be cleanly extracted into independent microservices (e.g., AWS Lambda or separate Node services).

---

## 3. Key Engineering Decisions

### 1. Feature-Based Architecture
* **Problem:** Standard MVC folders become unnavigable spaghetti code in large React/Express applications.
* **Solution:** Organized both frontend and backend by feature (e.g., `modules/submissions`, `features/appeals`).
* **Why:** High cohesion and low coupling. Deleting or modifying the "Appeals" feature requires touching only one directory.
* **Alternatives:** Layer-first (all controllers together, all components together). Rejected due to poor scalability.

### 2. Versioned Policies
* **Problem:** If an admin updates a moderation threshold (e.g., Explicit tolerance from 80% to 60%), past verdicts lose their context, making audits impossible.
* **Solution:** Policies are immutable once activated. Editing creates a new version (`v1` → `v2`).
* **Why:** Guarantees absolute deterministic auditing. A verdict generated a month ago explicitly points to the policy version active at that precise millisecond.
* **Alternatives:** Overwriting the single policy document. Rejected due to destruction of historical context.

### 3. Immutable Audit Logs
* **Problem:** Platform accountability requires knowing exactly *who* did *what* and *when*.
* **Solution:** A centralized, append-only `AuditService` that intercepts major system events (verdicts, logins, policy changes).
* **Why:** Establishes a chain of custody. If a user complains about a blocked image, admins can trace the exact AI evaluation, the policy version, and any subsequent admin overrides.
* **Alternatives:** Logging to stdout/console. Rejected because it lacks queryability and UI integration.

### 4. AI Provider Abstraction
* **Problem:** Tight coupling to Gemini means a massive refactor if we migrate to AWS Rekognition or OpenAI.
* **Solution:** The `AIProvider` interface. The orchestration layer only knows `processImage(buffer)`.
* **Why:** Dependency Inversion. The core domain logic depends on abstractions, not concrete vendor SDKs.
* **Alternatives:** Direct Gemini SDK calls in controllers. Rejected due to vendor lock-in.

### 5. Moderation Orchestration Layer
* **Problem:** Uploading an image, analyzing it, evaluating rules, and updating status involves multiple domain services.
* **Solution:** A dedicated `ModerationOrchestrator` service.
* **Why:** Prevents "God classes" and circular dependencies. The orchestrator acts as the conductor, calling `SubmissionService`, then `AIProvider`, then `VerdictService`.
* **Alternatives:** Stuffing all logic into `SubmissionController`. Rejected due to violation of the Single Responsibility Principle.

### 6. Verdict Engine Separation
* **Problem:** AI models return percentages (confidence scores). These are not business decisions.
* **Solution:** Separated the AI Analysis from the Verdict Generation.
* **Why:** The AI outputs "Violence: 90%". The `VerdictEngine` cross-references this with the `ActivePolicy`. If the policy states `Violence > 80% = BLOCK`, the engine generates the verdict. This separation allows us to re-run verdicts on the *same* AI analysis if policies change.
* **Alternatives:** Having the AI directly return "BLOCK". Rejected because it hardcodes business rules into prompts.

### 7. Appeal Snapshot Strategy
* **Problem:** When a user appeals a verdict, they are appealing the state of the system *at that moment*.
* **Solution:** The Appeal document embeds a `verdictSnapshot`.
* **Why:** Even if the original verdict is later overridden by an admin, the appeal retains the exact reasoning the user was contesting.
* **Alternatives:** Referencing the verdict ID only. Rejected because verdicts are mutable via admin overrides.

### 8. Submission-Image Relationship Design
* **Problem:** Users upload multiple images at once, but moderation happens per image.
* **Solution:** A 1-to-Many relationship. `Submission` acts as the parent envelope, while `Image` documents hold individual AI states (`PENDING`, `COMPLETED`).
* **Why:** Allows partial successes. If 1 out of 5 images fails AI analysis, the other 4 can still be approved. The parent submission aggregates the highest severity verdict.
* **Alternatives:** Storing an array of URLs inside the submission. Rejected due to inability to track granular, per-image AI status.

### 9. Local Storage vs Cloud Migration Path
* **Problem:** S3 is ideal for production, but adds friction to local development and onboarding.
* **Solution:** Implemented a disk-based storage system (`multer` + `/uploads`) hidden behind a metadata schema `storageType: 'LOCAL'`.
* **Why:** The application functions immediately upon cloning. Migrating to S3 only requires changing the storage controller implementation without altering the MongoDB schema.
* **Alternatives:** Forcing S3 credentials for local dev. Rejected due to poor developer experience (DX).

### 10. Security-First Middleware Stack
* **Problem:** APIs exposed to the public are vulnerable to XSS, CSRF, and injection attacks.
* **Solution:** Deep middleware stack: `helmet` for HTTP headers, `express-mongo-sanitize` for NoSQL injection protection, `zod` for strict runtime payload validation, and JWT-based Stateless Authentication.
* **Why:** Defense in depth. Validation occurs at the router level, preventing malformed data from ever reaching the domain logic.
* **Alternatives:** Ad-hoc validation inside controllers. Rejected due to high risk of missed edge cases.

---

## 4. Database Design

* **Users:** Manages authentication, identity, and RBAC (`USER`, `ADMIN`).
* **Policies:** Stores arrays of threshold rules (`category`, `threshold`, `action`). Indexed by `isActive` for lightning-fast active policy retrieval.
* **Submissions:** The parent entity holding metadata for a batch of images.
* **Images:** Stores the binary path, metadata, and the raw `moderationResult` payload returned by the AI provider.
* **Verdicts:** The business conclusion (`APPROVED`, `FLAGGED`, `BLOCKED`). Links an `Image` to a `PolicyVersion`.
* **Appeals:** Links a `User` to a `Submission` and its `Verdict`, storing the justification and admin resolution notes.
* **AuditLogs:** High-volume time-series data tracking state mutations. Indexed heavily by `entityId` and `createdAt`.

**Scalability Consideration:** As the database scales, `AuditLogs` and `Images` will be the largest collections. Future optimizations include TTL (Time To Live) indexes on Audit Logs or migrating them to cold storage after 90 days.

---

## 5. Moderation Pipeline

1. **Upload:** User submits a multipart form. `SubmissionService` creates the parent envelope, saves files to disk, and creates `Image` records with `PENDING` status.
2. **AI Analysis:** The Orchestrator sends the image buffer to `GeminiVision`. It receives back a structured JSON categorization array (Violence, Explicit, Hate Speech).
3. **Verdict Evaluation:** The Orchestrator pulls the `ActivePolicy`. The `VerdictEngine` compares the AI confidences against policy thresholds to determine the final action.
4. **Audit Logging:** The `AuditService` records the generated verdict.
5. **Status Update:** The image and parent submission statuses are updated to `COMPLETED` or `REJECTED`.
6. **Appeal Flow:** If blocked, the user can file an appeal. An admin reviews the appeal, viewing the original verdict and user justification, and can trigger a verdict override, which updates the submission status and logs a new audit event.

*Failure Handling:* If the AI provider rate-limits the request or fails, the image remains in a `PENDING`/`FAILED` state, allowing for manual retries via the admin or user dashboard.

---

## 6. Security

* **JWT Authentication:** Stateless token-based auth. Tokens are verified via middleware before any protected route is accessed.
* **Role-Based Access Control (RBAC):** `requireRole(['ADMIN'])` middleware strictly enforces authorization per route.
* **Zod Validation:** All incoming request bodies are parsed through strict Zod schemas, stripping unknown fields and ensuring data integrity.
* **Express-Mongo-Sanitize:** Strips keys containing `$` or `.` to prevent NoSQL injection.
* **Helmet:** Secures Express apps by setting various HTTP headers (XSS filtering, HSTS).

---

## 7. Frontend Architecture

The React/Next.js frontend mirrors the backend's strictness and feature-based organization.

* **Feature Organization:** Components, Hooks, and API calls are grouped by domain (`features/auth`, `features/submissions`).
* **React Query Strategy:** Centralized query key factories ensure cache invalidation is precise. E.g., overriding a verdict invalidates only that specific submission's cache, preventing unnecessary full-page data fetches.
* **Optimistic Updates:** Immediate UI feedback is implemented for critical admin actions (like approving appeals). The UI updates instantly, rolling back silently if the background network request fails.
* **Error Boundaries:** The application utilizes `react-error-boundary` to gracefully catch and isolate rendering errors, presenting a fallback UI instead of a white screen of death.
* **Lazy Loading:** Heavy dependencies (like `recharts`) are dynamically imported via `next/dynamic` to ensure the initial JS bundle remains exceptionally small and fast.

---

## 8. Analytics Engine

The admin dashboard relies on native MongoDB Aggregation Pipelines to process data at the database level rather than moving large datasets into Node.js memory.
* **Trends:** Calculates a 30-day trailing window of daily moderation volume, utilizing `$group` and `$match` stages.
* **Categories:** Unwinds nested AI category arrays to generate a frequency map of the most triggered platform violations.

---

## 9. Scalability Roadmap

If this project were moving to true production, the following architectural shifts would be prioritized:
1. **Queue Processing (BullMQ/Redis):** Synchronous AI processing blocks the HTTP thread. Implementing BullMQ would allow immediate `202 Accepted` responses, processing images asynchronously via background workers.
2. **Cloud Storage (AWS S3):** Migrating from local `/uploads` to S3 buckets, utilizing pre-signed URLs for direct-to-cloud client uploads.
3. **WebSockets:** Implementing `Socket.io` to stream verdict results to the frontend instantly, removing the need for manual page refreshes or polling.
4. **Kubernetes:** Containerizing the Node application and deploying via K8s for auto-scaling during high-traffic upload events.

---

## 10. Installation Guide

### Prerequisites
* Node.js v18+
* MongoDB Community Server (running locally or via Atlas)
* Google Gemini API Key

### Backend Setup
```bash
cd backend
npm install

# Create .env based on the template
cp .env.example .env
# Important: Update GEMINI_API_KEY and MONGODB_URI in .env

# Seed the database with the initial Admin user and Base Policy
npm run seed:admin

# Start the development server
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install

# Start the frontend server
npm run dev
```
Navigate to `http://localhost:3000`. 
Log in using the seeded credentials: `admin@example.com` / `password123`.

---

## 11. API Documentation

The backend utilizes `swagger-ui-express` for interactive API documentation.
With the backend running, navigate to:
`http://localhost:5000/api-docs`

This interface allows you to view all DTOs, endpoint signatures, and execute requests directly against the local server.

---

## 12. Testing Strategy

* **Unit Testing / API:** All major flows were verified via Swagger and Postman collections prior to frontend implementation.
* **Type Verification:** Full `tsc --noEmit` checks run on both frontend and backend to guarantee end-to-end type safety.
* **Frontend E2E Verification:** A comprehensive manual testing walkthrough is documented in the project artifacts, verifying the critical paths for both standard users and administrative overrides.

---

## 13. Lessons Learned

**Architectural Tradeoffs:**
Initially, keeping the AI analysis synchronous within the HTTP request cycle was necessary for development speed. However, I quickly learned that external LLM APIs are unpredictable in latency. A 10-second processing time leaves the frontend hanging. This reinforced the engineering principle that all external API integrations should ideally be moved to asynchronous background queues for production resilience.

**Strict Type Mapping:**
Replicating Mongoose schemas into TypeScript interfaces required careful mapping. Utilizing Mongoose's `InferSchemaType` combined with shared monorepo types would have drastically reduced boilerplate and the risk of the backend and frontend falling out of sync.

---

## 14. Screenshots

*(Replace with actual screenshots of your running application)*

| User Dashboard | Submission Review |
| :---: | :---: |
| ![User Dashboard](./docs/images/user-dashboard.png) | ![Submission Review](./docs/images/submission-review.png) |

| Admin Analytics | Appeals Queue |
| :---: | :---: |
| ![Admin Analytics](./docs/images/analytics.png) | ![Appeals Queue](./docs/images/appeals.png) |

---

## 15. Conclusion

This project transcends a simple CRUD application. It demonstrates the ability to conceptualize, architect, and deliver a complex, stateful system integrating modern AI capabilities with traditional enterprise requirements like RBAC, immutable auditing, and deterministic policy engines. The implementation balances rapid development with scalable architectural patterns, resulting in a robust, production-oriented content moderation platform.
