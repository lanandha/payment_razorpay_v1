import { Logger } from "@medusajs/medusa";
import { Options, RazorpayOptions, RazorpayProviderConfig } from "../../src/types";
import Razorpay from "razorpay";
import { CreatePaymentProviderSession, CustomerDTO, HttpTypes, PaymentProviderError, PaymentProviderSessionResponse, ProviderWebhookPayload, UpdatePaymentProviderSession, WebhookActionResult } from "@medusajs/framework/types";
import { AbstractPaymentProvider, PaymentSessionStatus } from "@medusajs/framework/utils";
import { PaymentIntentOptions } from "../../src/types";
import { Customers } from "razorpay/dist/types/customers";
import { Orders } from "razorpay/dist/types/orders";
import { Payments } from "razorpay/dist/types/payments";
/**
 * The paymentIntent object corresponds to a razorpay order.
 *
 */
declare abstract class RazorpayBase extends AbstractPaymentProvider {
    static identifier: string;
    protected readonly options_: RazorpayProviderConfig & Options;
    protected razorpay_: Razorpay;
    logger: Logger;
    container_: any;
    protected constructor(container: any, options: any);
    static validateOptions(options: RazorpayOptions): void;
    protected init(): void;
    abstract get paymentIntentOptions(): PaymentIntentOptions;
    getPaymentIntentOptions(): Partial<PaymentIntentOptions>;
    _validateSignature(razorpay_payment_id: string, razorpay_order_id: string, razorpay_signature: string): boolean;
    getRazorpayPaymentStatus(paymentIntent: Orders.RazorpayOrder, attempts: {
        entity: string;
        count: number;
        items: Array<Payments.RazorpayPayment>;
    }): Promise<PaymentSessionStatus>;
    getPaymentStatus(paymentSessionData: Record<string, unknown>): Promise<PaymentSessionStatus>;
    updateRazorpayMetadataInCustomer(customer: CustomerDTO, parameterName: string, parameterValue: string): Promise<CustomerDTO>;
    editExistingRpCustomer(customer: CustomerDTO, intentRequest: any, extra: HttpTypes.StoreCart): Promise<Customers.RazorpayCustomer | undefined>;
    createRazorpayCustomer(customer: CustomerDTO, intentRequest: any, extra: HttpTypes.StoreCart): Promise<Customers.RazorpayCustomer | undefined>;
    pollAndRetrieveCustomer(customer: CustomerDTO): Promise<Customers.RazorpayCustomer>;
    fetchOrPollForCustomer(customer: CustomerDTO): Promise<Customers.RazorpayCustomer | undefined>;
    createOrUpdateCustomer(intentRequest: any, customer: CustomerDTO, extra: HttpTypes.StoreCart): Promise<Customers.RazorpayCustomer | undefined>;
    initiatePayment(input: CreatePaymentProviderSession): Promise<PaymentProviderError | PaymentProviderSessionResponse>;
    authorizePayment(paymentSessionData: Record<string, unknown>, context?: Record<string, unknown>): Promise<PaymentProviderError | {
        status: PaymentSessionStatus;
        data: PaymentProviderSessionResponse;
    }>;
    cancelPayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse>;
    capturePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | Record<string, unknown>>;
    deletePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse>;
    refundPayment(paymentSessionData: Record<string, unknown>, refundAmount: any): Promise<PaymentProviderError | PaymentProviderSessionResponse>;
    retrievePayment(paymentSessionData: Record<string, unknown>): Promise<PaymentProviderError | PaymentProviderSessionResponse>;
    updatePayment(input: UpdatePaymentProviderSession): Promise<PaymentProviderError | PaymentProviderSessionResponse>;
    updatePaymentData(sessionId: string, data: Record<string, unknown>): Promise<PaymentProviderSessionResponse | PaymentProviderError>;
    constructWebhookEvent(data: any, signature: any): boolean;
    protected buildError(message: string, e: PaymentProviderError | Error): PaymentProviderError;
    getWebhookActionAndData(webhookData: ProviderWebhookPayload["payload"]): Promise<WebhookActionResult>;
}
export default RazorpayBase;
//# sourceMappingURL=razorpay-base.d.ts.map