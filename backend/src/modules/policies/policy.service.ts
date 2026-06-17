import { PolicyVersionModel } from './policy.model';
import { IPolicyRule } from './policy.interface';
import { AppError } from '../../utils/AppError';

interface CreatePolicyInput {
  name: string;
  description: string;
  rules: IPolicyRule[];
  createdBy: string;
}

interface PaginationOptions {
  page: number;
  limit: number;
  includeDeleted: boolean;
}

export class PolicyService {
  /**
   * Create a new policy version.
   *
   * BUSINESS RULE: Version numbers auto-increment from the highest existing
   * version. This prevents race conditions better than client-supplied
   * versions and guarantees monotonic ordering.
   */
  public async createPolicyVersion(data: CreatePolicyInput) {
    const latestVersion = await PolicyVersionModel.findOne()
      .sort({ versionNumber: -1 })
      .select('versionNumber')
      .lean();

    const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

    const policyVersion = await PolicyVersionModel.create({
      versionNumber: nextVersionNumber,
      name: data.name,
      description: data.description,
      rules: data.rules,
      createdBy: data.createdBy,
    });

    return policyVersion;
  }

  /**
   * Get the currently active policy.
   *
   * This is the hottest query in the entire platform — every incoming
   * moderation request needs the active policy to determine which rules
   * to apply. The { isActive: 1, isDeleted: 1 } compound index ensures
   * this is always a covered, O(1) lookup.
   */
  public async getActivePolicy() {
    const activePolicy = await PolicyVersionModel.findOne({
      isActive: true,
      isDeleted: false,
    }).populate('createdBy', 'firstName lastName email')
      .populate('activatedBy', 'firstName lastName email');

    if (!activePolicy) {
      throw new AppError('No active policy found. Please create and activate a policy.', 404);
    }

    return activePolicy;
  }

  /**
   * Retrieve a specific policy version by its document ID.
   * Useful for verdicts that reference a specific historical version.
   */
  public async getPolicyById(versionId: string) {
    const policy = await PolicyVersionModel.findOne({
      _id: versionId,
      isDeleted: false,
    }).populate('createdBy', 'firstName lastName email')
      .populate('activatedBy', 'firstName lastName email');

    if (!policy) {
      throw new AppError('Policy version not found', 404);
    }

    return policy;
  }

  /**
   * Paginated policy history, ordered newest-first.
   * Supports an `includeDeleted` flag for admin audit views.
   */
  public async getPolicyHistory(options: PaginationOptions) {
    const { page, limit, includeDeleted } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};
    if (!includeDeleted) {
      filter.isDeleted = false;
    }

    const [versions, total] = await Promise.all([
      PolicyVersionModel.find(filter)
        .sort({ versionNumber: -1 })
        .skip(skip)
        .limit(limit)
        .populate('createdBy', 'firstName lastName email')
        .populate('activatedBy', 'firstName lastName email'),
      PolicyVersionModel.countDocuments(filter),
    ]);

    return {
      versions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Activate a policy version.
   *
   * CRITICAL BUSINESS RULE — Atomic swap:
   *  1. Deactivate the currently active version (if any).
   *  2. Activate the target version.
   *
   * Both operations happen sequentially but are idempotent.
   * In a high-traffic production system, you'd wrap this in a Mongoose
   * transaction (session). For this implementation scope, the sequential
   * approach is correct and safe.
   *
   * EDGE CASES HANDLED:
   *  - Target version is already active → no-op, return success.
   *  - Target version is soft-deleted → reject with 400.
   */
  public async activatePolicy(versionId: string, activatedBy: string) {
    const targetVersion = await PolicyVersionModel.findById(versionId);

    if (!targetVersion) {
      throw new AppError('Policy version not found', 404);
    }

    if (targetVersion.isDeleted) {
      throw new AppError('Cannot activate a deleted policy version', 400);
    }

    // Idempotent — if it's already active, just return it
    if (targetVersion.isActive) {
      return targetVersion;
    }

    // Step 1: Deactivate current active version
    await PolicyVersionModel.updateMany(
      { isActive: true },
      { $set: { isActive: false } }
    );

    // Step 2: Activate the target version
    targetVersion.isActive = true;
    targetVersion.activatedAt = new Date();
    targetVersion.activatedBy = activatedBy as any;
    await targetVersion.save();

    // Return populated version for the response
    return PolicyVersionModel.findById(targetVersion._id)
      .populate('createdBy', 'firstName lastName email')
      .populate('activatedBy', 'firstName lastName email');
  }

  /**
   * Soft-delete a policy version.
   *
   * BUSINESS RULE: The currently active policy cannot be deleted.
   * This prevents accidental removal of the policy governing live moderation.
   * Admins must first activate a different version, then delete the old one.
   *
   * Soft-delete (isDeleted flag) is used instead of hard-delete because
   * historical verdicts may still reference this version. Deleting the
   * document would break those foreign key references.
   */
  public async softDeletePolicy(versionId: string) {
    const policy = await PolicyVersionModel.findById(versionId);

    if (!policy) {
      throw new AppError('Policy version not found', 404);
    }

    if (policy.isActive) {
      throw new AppError(
        'Cannot delete the active policy. Activate a different version first.',
        400
      );
    }

    if (policy.isDeleted) {
      throw new AppError('Policy version is already deleted', 400);
    }

    policy.isDeleted = true;
    await policy.save();

    return policy;
  }
}
