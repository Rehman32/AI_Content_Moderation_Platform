import { Types } from 'mongoose';
import { AppealModel } from './appeal.model';
import { AppealStatus } from './appeal.interface';
import { SubmissionModel } from '../submissions/submission.model';
import { VerdictModel } from '../verdicts/verdict.model';
import { AppError } from '../../utils/AppError';
import { auditService } from '../audit/audit.service';
import { AuditEventType, EntityType } from '../audit/audit.interface';
import { UserRole } from '../users/user.interface';

interface CreateAppealParams {
  submissionId: string;
  appellantId: string;
  reason: string;
}

interface ReviewAppealParams {
  appealId: string;
  adminId: string;
  adminNotes?: string;
}

interface ListAppealsOptions {
  page: number;
  limit: number;
  status?: AppealStatus;
  appellantId?: string;
}

/**
 * The terminal statuses — once an appeal reaches these, it is immutable.
 */
const TERMINAL_STATUSES = new Set([AppealStatus.APPROVED, AppealStatus.REJECTED]);

export class AppealService {
  /**
   * Create a new appeal for a submission.
   *
   * BUSINESS RULES ENFORCED:
   *  1. Submission must exist.
   *  2. Only the submission owner can file an appeal (appellantId === submittedBy).
   *  3. Only one ACTIVE appeal per submission at a time (no PENDING or UNDER_REVIEW).
   *  4. The submission must have a verdict to appeal against. No verdict = nothing to challenge.
   *  5. The verdict snapshot captures the current verdict outcome, making the
   *     appeal self-describing and immune to future policy changes.
   */
  public async createAppeal(params: CreateAppealParams) {
    const { submissionId, appellantId, reason } = params;

    // ── Rule 1: Submission must exist ─────────────────────────────────────────
    const submission = await SubmissionModel.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // ── Rule 2: Only the submission owner can appeal ───────────────────────────
    if (submission.submittedBy.toString() !== appellantId) {
      throw new AppError(
        'Forbidden: only the submission owner may file an appeal',
        403
      );
    }

    // ── Rule 3: No duplicate active appeals ────────────────────────────────────
    const existingActiveAppeal = await AppealModel.findOne({
      submissionId: new Types.ObjectId(submissionId),
      status: { $in: [AppealStatus.PENDING, AppealStatus.UNDER_REVIEW] },
    });

    if (existingActiveAppeal) {
      throw new AppError(
        `An active appeal already exists for this submission (status: ${existingActiveAppeal.status}). ` +
        `Wait for the current appeal to be resolved before filing a new one.`,
        409
      );
    }

    // ── Rule 4: There must be a verdict to appeal against ─────────────────────
    // Fetch the most recent verdict for this submission (sorted by policyVersionNumber desc)
    const latestVerdict = await VerdictModel.findOne({
      submissionId: new Types.ObjectId(submissionId),
    }).sort({ policyVersionNumber: -1 });

    if (!latestVerdict) {
      throw new AppError(
        'No verdict found for this submission. A moderation verdict must exist before an appeal can be filed.',
        400
      );
    }

    // ── Rule 5: Capture verdict snapshot ──────────────────────────────────────
    const verdictSnapshot = {
      verdictId: latestVerdict._id as Types.ObjectId,
      finalOutcome: latestVerdict.finalOutcome,
      reasoning: latestVerdict.reasoning,
      policyVersionNumber: latestVerdict.policyVersionNumber,
    };

    // ── Create the appeal ──────────────────────────────────────────────────────
    const appeal = await AppealModel.create({
      submissionId: new Types.ObjectId(submissionId),
      appellantId: new Types.ObjectId(appellantId),
      verdictSnapshot,
      reason,
      status: AppealStatus.PENDING,
    });

    // ── Audit log ──────────────────────────────────────────────────────────────
    await auditService.logEvent({
      actorId: appellantId,
      actorRole: UserRole.USER,
      eventType: AuditEventType.APPEAL_CREATED,
      entityType: EntityType.APPEAL,
      entityId: appeal._id as Types.ObjectId,
      newState: {
        status: AppealStatus.PENDING,
        verdictOutcome: verdictSnapshot.finalOutcome,
      },
      metadata: { submissionId, reason: reason.substring(0, 100) }, // Truncate for log safety
    });

    console.log(
      `[AppealService] Appeal ${appeal._id} created for submission ${submissionId} ` +
      `by user ${appellantId}`
    );

    return appeal;
  }

  /**
   * Admin approves an appeal.
   *
   * SIDE EFFECTS:
   *  1. Appeal status → APPROVED (terminal, immutable).
   *  2. The referenced verdict is marked isOverridden = true.
   *  3. Audit event written.
   *
   * NOTE ON VERDICT OVERRIDE:
   *  Approving an appeal means "the moderation decision was wrong." We mark
   *  the verdict as overridden (isOverridden = true) but do NOT delete it.
   *  Immutability of verdict documents is preserved — the override flag + the
   *  appeal record together form the complete audit chain.
   */
  public async approveAppeal(params: ReviewAppealParams) {
    const { appealId, adminId, adminNotes } = params;

    const appeal = await AppealModel.findById(appealId);
    if (!appeal) throw new AppError('Appeal not found', 404);

    // Terminal state guard — once resolved, an appeal cannot be changed
    if (TERMINAL_STATUSES.has(appeal.status)) {
      throw new AppError(
        `Appeal is already in a terminal state (${appeal.status}) and cannot be modified.`,
        400
      );
    }

    // Update the appeal to APPROVED
    appeal.status = AppealStatus.APPROVED;
    appeal.reviewedBy = new Types.ObjectId(adminId);
    appeal.reviewedAt = new Date();
    appeal.adminNotes = adminNotes || null!;
    await appeal.save();

    // Mark the contested verdict as overridden (non-destructive)
    await VerdictModel.findByIdAndUpdate(appeal.verdictSnapshot.verdictId, {
      isOverridden: true,
      overriddenBy: new Types.ObjectId(adminId),
      overriddenAt: new Date(),
    });

    // Audit log
    await auditService.logEvent({
      actorId: adminId,
      actorRole: UserRole.ADMIN,
      eventType: AuditEventType.APPEAL_APPROVED,
      entityType: EntityType.APPEAL,
      entityId: appeal._id as Types.ObjectId,
      previousState: { status: AppealStatus.PENDING },
      newState: { status: AppealStatus.APPROVED },
      metadata: {
        submissionId: appeal.submissionId.toString(),
        verdictId: appeal.verdictSnapshot.verdictId.toString(),
        adminNotes: adminNotes?.substring(0, 100),
      },
    });

    console.log(
      `[AppealService] Appeal ${appealId} APPROVED by admin ${adminId}`
    );

    return appeal;
  }

  /**
   * Admin rejects an appeal.
   *
   * The original verdict stands — no changes to the verdict document.
   * The appeal moves to REJECTED (terminal, immutable).
   */
  public async rejectAppeal(params: ReviewAppealParams) {
    const { appealId, adminId, adminNotes } = params;

    const appeal = await AppealModel.findById(appealId);
    if (!appeal) throw new AppError('Appeal not found', 404);

    if (TERMINAL_STATUSES.has(appeal.status)) {
      throw new AppError(
        `Appeal is already in a terminal state (${appeal.status}) and cannot be modified.`,
        400
      );
    }

    appeal.status = AppealStatus.REJECTED;
    appeal.reviewedBy = new Types.ObjectId(adminId);
    appeal.reviewedAt = new Date();
    appeal.adminNotes = adminNotes || null!;
    await appeal.save();

    // Audit log
    await auditService.logEvent({
      actorId: adminId,
      actorRole: UserRole.ADMIN,
      eventType: AuditEventType.APPEAL_REJECTED,
      entityType: EntityType.APPEAL,
      entityId: appeal._id as Types.ObjectId,
      previousState: { status: AppealStatus.PENDING },
      newState: { status: AppealStatus.REJECTED },
      metadata: {
        submissionId: appeal.submissionId.toString(),
        adminNotes: adminNotes?.substring(0, 100),
      },
    });

    console.log(
      `[AppealService] Appeal ${appealId} REJECTED by admin ${adminId}`
    );

    return appeal;
  }

  /**
   * Admin marks an appeal as UNDER_REVIEW (triage step).
   * Optional — admins can approve/reject directly from PENDING.
   */
  public async markUnderReview(appealId: string, adminId: string) {
    const appeal = await AppealModel.findById(appealId);
    if (!appeal) throw new AppError('Appeal not found', 404);

    if (appeal.status !== AppealStatus.PENDING) {
      throw new AppError(
        `Only PENDING appeals can be marked UNDER_REVIEW. Current status: ${appeal.status}`,
        400
      );
    }

    appeal.status = AppealStatus.UNDER_REVIEW;
    await appeal.save();

    return appeal;
  }

  /**
   * Get a single appeal by ID.
   * Includes populated appellant and reviewer details for display.
   */
  public async getAppealById(appealId: string, requesterId: string, requesterRole: string) {
    const appeal = await AppealModel.findById(appealId)
      .populate('appellantId', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email')
      .populate('submissionId', 'title status');

    if (!appeal) throw new AppError('Appeal not found', 404);

    // Users can only see their own appeals; admins can see all
    if (
      requesterRole !== UserRole.ADMIN &&
      appeal.appellantId.toString() !== requesterId
    ) {
      throw new AppError('Forbidden: you do not have access to this appeal', 403);
    }

    return appeal;
  }

  /**
   * Get all appeals for a specific submission.
   * Includes full appeal history (approved, rejected, pending).
   * Accessible by submission owner or admin.
   */
  public async getAppealsBySubmission(
    submissionId: string,
    requesterId: string,
    requesterRole: string
  ) {
    // Ownership check for non-admins
    if (requesterRole !== UserRole.ADMIN) {
      const submission = await SubmissionModel.findById(submissionId);
      if (!submission) throw new AppError('Submission not found', 404);
      if (submission.submittedBy.toString() !== requesterId) {
        throw new AppError('Forbidden: you do not have access to this submission', 403);
      }
    }

    return await AppealModel.find({
      submissionId: new Types.ObjectId(submissionId),
    })
      .sort({ createdAt: -1 })
      .populate('appellantId', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName email');
  }

  /**
   * Paginated list of all appeals — admin review queue.
   * Supports filtering by status (e.g. status=PENDING for the review queue).
   */
  public async listAppeals(options: ListAppealsOptions) {
    const { page, limit, status, appellantId } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (status && Object.values(AppealStatus).includes(status)) {
      filter.status = status;
    }
    if (appellantId) {
      filter.appellantId = new Types.ObjectId(appellantId);
    }

    const [appeals, total] = await Promise.all([
      AppealModel.find(filter)
        .sort({ createdAt: 1 }) // Oldest first — FIFO fairness for review queue
        .skip(skip)
        .limit(limit)
        .populate('appellantId', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName email')
        .populate('submissionId', 'title status'),
      AppealModel.countDocuments(filter),
    ]);

    return {
      appeals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
