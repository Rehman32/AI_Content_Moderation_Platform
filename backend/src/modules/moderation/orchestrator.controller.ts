import { Request, Response, NextFunction } from 'express';
import { ModerationOrchestrator, StepStatus } from './moderation-orchestrator.service';

const orchestrator = new ModerationOrchestrator();

export class OrchestratorController {
  /**
   * POST /api/v1/moderation/images/:imageId/process
   * Execute the full pipeline for a single image:
   * AI Analysis → Policy Evaluation → Verdict → Status Update
   */
  public async processImage(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orchestrator.orchestrateImage(req.params.imageId as string);

      const hasFailed = result.steps.some((s) => s.status === StepStatus.FAILED);

      res.status(hasFailed ? 207 : 200).json({
        success: !hasFailed,
        message: hasFailed
          ? 'Pipeline completed with errors — review step details'
          : `Image processed successfully. Verdict: ${result.finalOutcome}`,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/moderation/submissions/:submissionId/process
   * Execute the full pipeline for all processable images in a submission.
   */
  public async processSubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await orchestrator.orchestrateSubmission(
        req.params.submissionId as string
      );

      const statusCode = result.failed > 0 ? 207 : 200;

      res.status(statusCode).json({
        success: result.failed === 0,
        message:
          result.failed === 0
            ? `All ${result.succeeded} image(s) processed. Overall verdict: ${result.overallOutcome}`
            : `${result.succeeded} succeeded, ${result.failed} failed. Overall verdict: ${result.overallOutcome}`,
        data: { result },
      });
    } catch (error) {
      next(error);
    }
  }
}
