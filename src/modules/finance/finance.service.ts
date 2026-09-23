import { HttpStatusCodes } from "../../shared/constants/http-status-codes.constants";
import type { EffectiveTenant } from "../../shared/dtos/effective-tenant.dto";
import { ErrorCodes } from "../../shared/enums/core/error-codes.enum";
import { PaymentStatusEnum } from "../../shared/enums/license/payment-status.enum";
import { AppError } from "../../shared/errors/app-error";
import type {
  CreateRazorpayOrderInput,
  CreateRazorpayOrderResult,
  RazorpayProvider,
} from "../../shared/providers/finance/razorpay.provider";
import { logger } from "../../shared/utils/core/logger";
import type { BranchRepository } from "../branch/branch.repository";
import type { LicenseTransactionRepository } from "../license/repositories/license-transaction.repository";
import type {
  GetBranchTaxProfileForCloneServiceInput,
  GetTenantTaxProfileServiceInput,
  HandleRazorpayWebhookServiceInput,
  TenantTaxProfileWithComponents,
  UpdateTenantTaxProfileServiceInput,
  VerifyRazorpayPaymentServiceInput,
} from "./finance.types";
import type { TaxRepository } from "./repositories/tax.repository";

export class FinanceService {
  constructor(
    private readonly razorpayProvider: RazorpayProvider,
    private readonly licenseTransactionRepository: LicenseTransactionRepository,
    private readonly taxRepository: TaxRepository,
    private readonly branchRepository: BranchRepository,
  ) {}

  // ========================================
  // ? PAYMENT WEBHOOKS
  // ========================================
  async handleRazorpayWebhook(
    input: HandleRazorpayWebhookServiceInput,
  ): Promise<void> {
    logger.log(
      `[FinanceService] Razorpay webhook received: ${JSON.stringify({
        headers: input.headers,
        body: input.body,
      })}`,
    );

    const { event, payload } = input.body;
    const payment = payload.payment?.entity;
    if (!payment?.order_id) return;

    if (event === "payment.failed") {
      const failureReason =
        payment.error_description ?? payment.error_reason ?? "Payment failed";

      await this.licenseTransactionRepository.updateTransactionStatusByOrderId({
        paymentProviderOrderId: payment.order_id,
        currentPaymentStatus: PaymentStatusEnum.PENDING,
        newPaymentStatus: PaymentStatusEnum.FAILED,
        paymentReference: payment.id,
        failureReason,
      });
    }
  }

  // ========================================
  // ? PAYMENTS
  // ========================================
  async createRazorpayOrder(
    input: CreateRazorpayOrderInput,
  ): Promise<CreateRazorpayOrderResult> {
    return this.razorpayProvider.createOrder(input);
  }

  async verifyRazorpayPayment(
    params: VerifyRazorpayPaymentServiceInput,
  ): Promise<void> {
    const isSignatureValid = this.razorpayProvider.verifyPaymentSignature({
      orderId: params.razorpayOrderId,
      paymentId: params.razorpayPaymentId,
      signature: params.razorpaySignature,
    });
    if (!isSignatureValid) {
      throw new AppError("Payment verification failed", {
        statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }

    const order = await this.razorpayProvider.fetchOrder(
      params.razorpayOrderId,
    );

    const expectedAmountInSubunits = Math.round(
      Number(params.expectedAmount) * 100,
    );
    const isValid =
      order.status === "paid" &&
      order.amount === expectedAmountInSubunits &&
      order.currency === params.expectedCurrency;

    if (!isValid) {
      throw new AppError("Payment verification failed", {
        statusCode: HttpStatusCodes.PAYMENT_REQUIRED,
        code: ErrorCodes.PAYMENT_GATEWAY_ERROR,
      });
    }
  }

  // ========================================
  // ? TENANT TAX PROFILES
  // ========================================
  async getTenantTaxProfile(
    input: GetTenantTaxProfileServiceInput,
  ): Promise<TenantTaxProfileWithComponents | null> {
    const branchId = this.requireTaxBranch(input.effectiveTenant);

    return this.taxRepository.findTenantProfile({
      organizationId: input.effectiveTenant.organizationId,
      branchId,
      conditionTypes: input.filters?.conditionTypes,
    });
  }

  async updateTenantTaxProfile(
    input: UpdateTenantTaxProfileServiceInput,
  ): Promise<TenantTaxProfileWithComponents> {
    const { data, user, effectiveTenant } = input;
    const branchId = this.requireTaxBranch(effectiveTenant);
    const organizationId = effectiveTenant.organizationId;

    const existing = await this.taxRepository.findTenantProfile({
      organizationId,
      branchId,
    });

    if (!existing) {
      return this.taxRepository.createTenantProfile({
        data: {
          organizationId,
          branchId,
          name: data.name,
          isTaxInclusive: data.isTaxInclusive ?? false,
          components: data.components,
          createdBy: user.id,
        },
      });
    }

    const profile = await this.taxRepository.updateTenantProfile({
      data: {
        id: existing.id,
        organizationId,
        branchId,
        name: data.name,
        isTaxInclusive: data.isTaxInclusive ?? false,
        components: data.components,
        updatedBy: user.id,
      },
    });

    if (!profile) {
      throw new AppError("Tax profile not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return profile;
  }

  async getBranchTaxProfileForClone(
    input: GetBranchTaxProfileForCloneServiceInput,
  ): Promise<TenantTaxProfileWithComponents | null> {
    const targetBranchId = this.requireTaxBranch(input.effectiveTenant);
    const sourceBranch = await this.findCloneSourceOrThrow(
      input.branchId,
      input.effectiveTenant,
      targetBranchId,
    );

    return this.taxRepository.findTenantProfile({
      organizationId: input.effectiveTenant.organizationId,
      branchId: sourceBranch.id,
      conditionTypes: input.filters?.conditionTypes,
    });
  }

  private async findCloneSourceOrThrow(
    sourceBranchId: string,
    effectiveTenant: EffectiveTenant,
    targetBranchId: string,
  ) {
    if (sourceBranchId === targetBranchId) {
      throw new AppError("Pick a different branch to clone from", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    const branch = await this.branchRepository.findOne({
      id: sourceBranchId,
      organizationId: effectiveTenant.organizationId,
    });

    if (!branch) {
      throw new AppError("Branch not found", {
        statusCode: HttpStatusCodes.NOT_FOUND,
        code: ErrorCodes.RESOURCE_NOT_FOUND,
      });
    }

    return branch;
  }

  private requireTaxBranch(effectiveTenant: EffectiveTenant): string {
    if (!effectiveTenant.branchId) {
      throw new AppError("A branch must be selected to manage tax profiles", {
        statusCode: HttpStatusCodes.BAD_REQUEST,
        code: ErrorCodes.BAD_REQUEST,
      });
    }

    return effectiveTenant.branchId;
  }
}
