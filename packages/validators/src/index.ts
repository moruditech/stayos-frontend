export {
  registerSchema,
  loginSchema,
  mfaVerifySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  claimAccountSchema,
  changePasswordSchema,
  mfaDisableSchema,
} from './auth';
export type {
  RegisterInput,
  LoginInput,
  MfaVerifyInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ClaimAccountInput,
  ChangePasswordInput,
  MfaDisableInput,
  UserType,
} from './auth';

export {
  staffCreateBookingSchema,
  publicBookingSchema,
  updateBookingSchema,
  rescheduleBookingSchema,
  bookingFiltersSchema,
} from './booking';
export type {
  StaffCreateBookingInput,
  PublicBookingInput,
  UpdateBookingInput,
  RescheduleBookingInput,
  BookingFilters,
} from './booking';

export { contactSchema } from './contact';
export type { ContactInput } from './contact';

export { newsletterSubscribeSchema } from './newsletter';
export type { NewsletterSubscribeInput } from './newsletter';

export {
  updateAgencyProfileSchema,
  requestExistingMandateSchema,
  onboardNewPropertySchema,
  terminateMandateSchema,
  createAgencyStaffSchema,
  updateAgencyStaffSchema,
  staffPropertyAssignSchema,
} from './agency';
export type {
  UpdateAgencyProfileInput,
  RequestExistingMandateInput,
  OnboardNewPropertyInput,
  TerminateMandateInput,
  CreateAgencyStaffInput,
  UpdateAgencyStaffInput,
  StaffPropertyAssignInput,
} from './agency';

export {
  changeTenantStatusSchema,
  setFeaturedSchema,
  changeAgencyStatusSchema,
  refundSubscriptionSchema,
  createPlatformUserSchema,
  updatePlatformUserSchema,
  createPlanSchema,
  updatePlanSchema,
  createCouponSchema,
  updateCouponSchema,
  rewardReferralSchema,
  approveApplicationSchema,
  rejectApplicationSchema,
  requestDocsSchema,
  flagApplicationSchema,
  reviewDocumentSchema,
  moderateReviewSchema,
  assignTicketSchema,
  updateTicketStatusSchema,
} from './platform';
export type {
  ChangeTenantStatusInput,
  SetFeaturedInput,
  ChangeAgencyStatusInput,
  RefundSubscriptionInput,
  CreatePlatformUserInput,
  UpdatePlatformUserInput,
  CreatePlanInput,
  UpdatePlanInput,
  CreateCouponInput,
  UpdateCouponInput,
  RewardReferralInput,
  ApproveApplicationInput,
  RejectApplicationInput,
  RequestDocsInput,
  FlagApplicationInput,
  ReviewDocumentInput,
  ModerateReviewInput,
  AssignTicketInput,
  UpdateTicketStatusInput,
} from './platform';

// Additional domain schemas are added here as each portal phase requires them,
// following the same pattern: one file per domain, one schema per form,
// field names verified against the backend's validation schema before adding.
