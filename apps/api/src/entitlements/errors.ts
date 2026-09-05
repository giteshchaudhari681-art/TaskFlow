import { AppError } from '../middleware/errorHandler.js';
import type { EntitlementErrorDetails } from '@taskflow/shared';

export class EntitlementLimitError extends AppError {
  constructor(
    message: string,
    public readonly entitlementDetails: EntitlementErrorDetails
  ) {
    super('ENTITLEMENT_LIMIT_REACHED', message, 403, entitlementDetails);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
