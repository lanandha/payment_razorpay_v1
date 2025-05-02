"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../types");
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("@medusajs/framework/utils");
const types_2 = require("../types");
const get_smallest_unit_1 = require("../utils/get-smallest-unit");
const update_razorpay_customer_metadata_1 = require("../workflows/update-razorpay-customer-metadata");
/**
 * The paymentIntent object corresponds to a razorpay order.
 *
 */
class RazorpayBase extends utils_1.AbstractPaymentProvider {
    constructor(container, options) {
        super(container, options);
        this.options_ = options;
        this.logger = container.logger;
        this.container_ = container;
        this.options_ = options;
        this.init();
    }
    static validateOptions(options) {
        if (!(0, utils_1.isDefined)(options.key_id)) {
            throw new Error("Required option `key_id` is missing in Razorpay plugin");
        }
        else if (!(0, utils_1.isDefined)(options.key_secret)) {
            throw new Error("Required option `key_secret` is missing in Razorpay plugin");
        }
    }
    init() {
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        this.razorpay_ =
            this.razorpay_ ||
                new razorpay_1.default({
                    key_id: this.options_.key_id ?? provider?.options.key_id,
                    key_secret: this.options_.key_secret ?? provider?.options.key_secret,
                    headers: {
                        "Content-Type": "application/json",
                        "X-Razorpay-Account": this.options_.razorpay_account ??
                            provider?.options.razorpay_account ??
                            undefined,
                    },
                });
    }
    getPaymentIntentOptions() {
        const options = {};
        if (this?.paymentIntentOptions?.capture_method) {
            options.capture_method = this.paymentIntentOptions.capture_method;
        }
        if (this?.paymentIntentOptions?.setup_future_usage) {
            options.setup_future_usage = this.paymentIntentOptions.setup_future_usage;
        }
        if (this?.paymentIntentOptions?.payment_method_types) {
            options.payment_method_types =
                this.paymentIntentOptions.payment_method_types;
        }
        return options;
    }
    _validateSignature(razorpay_payment_id, razorpay_order_id, razorpay_signature) {
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        const expectedSignature = crypto_1.default
            .createHmac("sha256", this.options_.key_secret ?? provider.options.key_secret)
            .update(body.toString())
            .digest("hex");
        return expectedSignature === razorpay_signature;
    }
    async getRazorpayPaymentStatus(paymentIntent, attempts) {
        if (!paymentIntent) {
            return utils_1.PaymentSessionStatus.ERROR;
        }
        else {
            const authorisedAttempts = attempts.items.filter((i) => i.status == utils_1.PaymentSessionStatus.AUTHORIZED);
            const totalAuthorised = authorisedAttempts.reduce((p, c) => {
                p += parseInt(`${c.amount}`);
                return p;
            }, 0);
            return totalAuthorised == paymentIntent.amount
                ? utils_1.PaymentSessionStatus.CAPTURED
                : utils_1.PaymentSessionStatus.REQUIRES_MORE;
        }
    }
    async getPaymentStatus(paymentSessionData) {
        const id = paymentSessionData?.data?.id;
        let paymentIntent;
        let paymentsAttempted;
        try {
            paymentIntent = await this.razorpay_.orders.fetch(id);
            paymentsAttempted = await this.razorpay_.orders.fetchPayments(id);
        }
        catch (e) {
            this.logger.warn("received payment data from session not order data");
            paymentIntent = await this.razorpay_.orders.fetch(id);
            paymentsAttempted = await this.razorpay_.orders.fetchPayments(id);
        }
        switch (paymentIntent.status) {
            // created' | 'authorized' | 'captured' | 'refunded' | 'failed'
            case "created":
                return utils_1.PaymentSessionStatus.REQUIRES_MORE;
            case "paid":
                return utils_1.PaymentSessionStatus.AUTHORIZED;
            case "attempted":
                return await this.getRazorpayPaymentStatus(paymentIntent, paymentsAttempted);
            default:
                return utils_1.PaymentSessionStatus.PENDING;
        }
    }
    async updateRazorpayMetadataInCustomer(customer, parameterName, parameterValue) {
        const metadata = customer.metadata;
        let razorpay = metadata?.razorpay;
        if (razorpay) {
            razorpay[parameterName] = parameterValue;
        }
        else {
            razorpay = {};
            razorpay[parameterName] = parameterValue;
        }
        //
        const x = await (0, update_razorpay_customer_metadata_1.updateRazorpayCustomerMetadataWorkflow)(this.container_).run({
            input: {
                medusa_customer_id: customer.id,
                razorpay,
            },
        });
        const result = x.result.customer;
        return result;
    }
    // @Todo refactor this function to 3 simple functions to make it more readable
    // 1. check existing customer
    // 2. create customer
    // 3. update customer
    async editExistingRpCustomer(customer, intentRequest, extra) {
        let razorpayCustomer;
        const razorpay_id = intentRequest.notes?.razorpay_id ||
            customer.metadata?.razorpay_id ||
            customer.metadata?.razorpay?.rp_customer_id;
        try {
            razorpayCustomer = await this.razorpay_.customers.fetch(razorpay_id);
        }
        catch (e) {
            this.logger.warn("unable to fetch customer in the razorpay payment processor");
        }
        // edit the customer once fetched
        if (razorpayCustomer) {
            const editEmail = customer.email;
            const editName = `${customer.first_name} ${customer.last_name}`.trim();
            const editPhone = customer?.phone ||
                customer?.addresses.find((v) => v.phone != undefined)?.phone;
            try {
                const updateRazorpayCustomer = await this.razorpay_.customers.edit(razorpayCustomer.id, {
                    email: editEmail ?? razorpayCustomer.email,
                    contact: editPhone ?? razorpayCustomer.contact,
                    name: editName != "" ? editName : razorpayCustomer.name,
                });
                razorpayCustomer = updateRazorpayCustomer;
            }
            catch (e) {
                this.logger.warn("unable to edit customer in the razorpay payment processor");
            }
        }
        if (!razorpayCustomer) {
            try {
                razorpayCustomer = await this.createRazorpayCustomer(customer, intentRequest, extra);
            }
            catch (e) {
                this.logger.error("something is very wrong please check customer in the dashboard.");
            }
        }
        return razorpayCustomer; // returning un modified razorpay customer
    }
    async createRazorpayCustomer(customer, intentRequest, extra) {
        let razorpayCustomer;
        const phone = customer.phone ??
            extra.billing_address?.phone ??
            customer?.addresses.find((v) => v.phone != undefined)?.phone;
        const gstin = customer?.metadata?.gstin ?? undefined;
        if (!phone) {
            throw new Error("phone number to create razorpay customer");
        }
        if (!customer.email) {
            throw new Error("email to create razorpay customer");
        }
        const firstName = customer.first_name ?? "";
        const lastName = customer.last_name ?? "";
        try {
            const customerParams = {
                email: customer.email,
                contact: phone,
                gstin: gstin,
                fail_existing: 0,
                name: `${firstName} ${lastName} `,
                notes: {
                    updated_at: new Date().toISOString(),
                },
            };
            razorpayCustomer = await this.razorpay_.customers.create(customerParams);
            intentRequest.notes.razorpay_id = razorpayCustomer?.id;
            if (customer && customer.id) {
                await this.updateRazorpayMetadataInCustomer(customer, "rp_customer_id", razorpayCustomer.id);
            }
            return razorpayCustomer;
        }
        catch (e) {
            this.logger.error("unable to create customer in the razorpay payment processor");
            return;
        }
    }
    async pollAndRetrieveCustomer(customer) {
        let customerList = [];
        let razorpayCustomer;
        const count = 10;
        let skip = 0;
        do {
            customerList = (await this.razorpay_.customers.all({
                count,
                skip,
            }))?.items;
            razorpayCustomer =
                customerList?.find((c) => c.contact == customer?.phone || c.email == customer.email) ?? customerList?.[0];
            if (razorpayCustomer) {
                await this.updateRazorpayMetadataInCustomer(customer, "rp_customer_id", razorpayCustomer.id);
                break;
            }
            if (!customerList || !razorpayCustomer) {
                throw new Error("no customers and cant create customers in razorpay");
            }
            skip += count;
        } while (customerList?.length == 0);
        return razorpayCustomer;
    }
    async fetchOrPollForCustomer(customer) {
        let razorpayCustomer;
        try {
            const rp_customer_id = customer.metadata?.razorpay?.rp_customer_id;
            if (rp_customer_id) {
                razorpayCustomer = await this.razorpay_.customers.fetch(rp_customer_id);
            }
            else {
                razorpayCustomer = await this.pollAndRetrieveCustomer(customer);
                this.logger.debug(`updated customer ${razorpayCustomer.email} with RpId :${razorpayCustomer.id}`);
            }
            return razorpayCustomer;
        }
        catch (e) {
            this.logger.error("unable to poll customer in the razorpay payment processor");
            return;
        }
    }
    async createOrUpdateCustomer(intentRequest, customer, extra) {
        let razorpayCustomer;
        try {
            const razorpay_id = customer.metadata?.razorpay?.rp_customer_id ||
                intentRequest.notes.razorpay_id;
            try {
                if (razorpay_id) {
                    this.logger.info("the updating  existing customer  in razorpay");
                    razorpayCustomer = await this.editExistingRpCustomer(customer, intentRequest, extra);
                }
            }
            catch (e) {
                this.logger.info("the customer doesn't exist in razopay");
            }
            try {
                if (!razorpayCustomer) {
                    this.logger.info("the creating  customer  in razopay");
                    razorpayCustomer = await this.createRazorpayCustomer(customer, intentRequest, extra);
                }
            }
            catch (e) {
                // if customer already exists in razorpay but isn't associated with a customer in medsusa
            }
            if (!razorpayCustomer) {
                try {
                    this.logger.info("relinking  customer  in razorpay by polling");
                    razorpayCustomer = await this.fetchOrPollForCustomer(customer);
                }
                catch (e) {
                    this.logger.error("unable to poll customer customer in the razorpay payment processor");
                }
            }
            return razorpayCustomer;
        }
        catch (e) {
            this.logger.error("unable to retrieve customer from cart");
        }
        return razorpayCustomer;
    }
    async initiatePayment(input) {
        const intentRequestData = this.getPaymentIntentOptions();
        const { currency_code, amount } = input;
        const { cart, notes, session_id } = input.data;
        if (!cart) {
            throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "cart not ready", utils_1.MedusaError.Codes.CART_INCOMPATIBLE_STATE);
        }
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        const sessionNotes = notes ?? {};
        // let toPay = (0, get_smallest_unit_1.getAmountFromSmallestUnit)(amount, 
        // // Math.round(parseInt(amount.toString())),
        // currency_code.toUpperCase());
        // toPay = currency_code.toUpperCase() == "INR" ? toPay * 100 * 100 : toPay;
        let toPay = amount;
        toPay = currency_code.toUpperCase() == "INR" ? toPay * 100 : toPay;
        const intentRequest = {
            amount: toPay,
            currency: currency_code.toUpperCase(),
            notes: {
                ...sessionNotes,
                resource_id: session_id ?? "",
                session_id: session_id,
                cart_id: cart?.id,
            },
            payment: {
                capture: this.options_.auto_capture ?? provider?.options.auto_capture
                    ? "automatic"
                    : "manual",
                capture_options: {
                    refund_speed: this.options_.refund_speed ??
                        provider?.options.refund_speed ??
                        "normal",
                    automatic_expiry_period: Math.max(this.options_.automatic_expiry_period ??
                        provider?.options.automatic_expiry_period ??
                        20, 12),
                    manual_expiry_period: Math.max(this.options_.manual_expiry_period ??
                        provider?.options.manual_expiry_period ??
                        10, 7200),
                },
            },
            ...intentRequestData,
        };
        let session_data;
        const customerDetails = cart?.customer;
        try {
            const razorpayCustomer = await this.createOrUpdateCustomer(intentRequest, customerDetails, cart);
            try {
                if (razorpayCustomer) {
                    this.logger.debug(`the intent: ${JSON.stringify(intentRequest)}`);
                }
                else {
                    this.logger.error("unable to find razorpay customer");
                }
                const phoneNumber = razorpayCustomer?.contact ?? cart.billing_address?.phone;
                if (!phoneNumber) {
                    const e = new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "no phone number", utils_1.MedusaError.Codes.CART_INCOMPATIBLE_STATE);
                    return this.buildError("An error occurred in InitiatePayment during the " +
                        "invalid phone number: " +
                        JSON.stringify(e), e);
                }
                session_data = await this.razorpay_.orders.create({
                    ...intentRequest,
                });
            }
            catch (e) {
                return this.buildError("An error occurred in InitiatePayment during the " +
                    "creation of the razorpay payment intent: " +
                    JSON.stringify(e), e);
            }
        }
        catch (e) {
            return this.buildError("An error occurred in creating customer request:" + e.message, e);
        }
        return {
            data: { ...session_data, intentRequest: intentRequest },
        };
    }
    async authorizePayment(paymentSessionData, context) {
        const status = await this.getPaymentStatus(paymentSessionData);
        return {
            data: {
                ...paymentSessionData,
            },
            status,
        };
    }
    async cancelPayment(paymentSessionData) {
        const error = {
            error: "Unable to cancel as razorpay doesn't support cancellation",
            code: types_2.ErrorCodes.UNSUPPORTED_OPERATION,
        };
        return error;
    }
    async capturePayment(paymentSessionData) {
        const order_id = paymentSessionData?.data?.data?.id;
        const paymentsResponse = await this.razorpay_.orders.fetchPayments(order_id);
        const possibleCaptures = paymentsResponse.items?.filter((item) => item.status == "authorized");
        const result = possibleCaptures?.map(async (payment) => {
            const { id, amount, currency } = payment;
            const toPay = (0, get_smallest_unit_1.getAmountFromSmallestUnit)(Math.round(parseInt(amount.toString())), currency.toUpperCase()) * 100;
            const paymentIntent = await this.razorpay_.payments.capture(id, toPay, currency);
            return paymentIntent;
        });
        if (result) {
            const payments = await Promise.all(result);
            const res = payments.reduce((acc, curr) => ((acc[curr.id] = curr), acc), {});
            paymentSessionData.payments = res;
        }
        return paymentSessionData;
    }
    async deletePayment(paymentSessionData) {
        return await this.cancelPayment(paymentSessionData);
    }
    async refundPayment(paymentSessionData, refundAmount) {
        const id = paymentSessionData
            .id;
        const paymentList = await this.razorpay_.orders.fetchPayments(id);
        const payment_id = paymentList.items?.find((p) => {
            return (parseInt(`${p.amount}`) >= parseInt(refundAmount.value) * 100 &&
                (p.status == "authorized" || p.status == "captured"));
        })?.id;
        if (payment_id) {
            const refundRequest = {
                amount: parseInt(refundAmount.value) * 100,
            };
            try {
                const refundSession = await this.razorpay_.payments.refund(payment_id, refundRequest);
                const refundsIssued = paymentSessionData.refundSessions;
                if (refundsIssued?.length > 0) {
                    refundsIssued.push(refundSession);
                }
                else {
                    paymentSessionData.refundSessions = [refundSession];
                }
            }
            catch (e) {
                return this.buildError("An error occurred in refundPayment", e);
            }
        }
        return paymentSessionData;
    }
    async retrievePayment(paymentSessionData) {
        let intent;
        try {
            const id = paymentSessionData
                .id;
            intent = await this.razorpay_.orders.fetch(id);
        }
        catch (e) {
            const id = paymentSessionData
                .order_id;
            try {
                intent = await this.razorpay_.orders.fetch(id);
            }
            catch (e) {
                this.buildError("An error occurred in retrievePayment", e);
            }
        }
        return intent;
    }
    async updatePayment(input) {
        const { amount, currency_code, context } = input;
        const { customer, billing_address, extra } = context;
        if (!billing_address && customer?.addresses?.length == 0) {
            return this.buildError("An error occurred in updatePayment during the retrieve of the cart", new Error("An error occurred in updatePayment during the retrieve of the cart"));
        }
        let refreshedCustomer;
        let customerPhone = "";
        let razorpayId;
        if (customer) {
            try {
                refreshedCustomer = input.context.customer;
                razorpayId = refreshedCustomer?.metadata?.razorpay
                    ?.rp_customer_id;
                customerPhone =
                    refreshedCustomer?.phone ?? billing_address?.phone ?? "";
                if (!refreshedCustomer.addresses.find((v) => v.id == billing_address?.id)) {
                    this.logger.warn("no customer billing found");
                }
            }
            catch {
                return this.buildError("An error occurred in updatePayment during the retrieve of the customer", new Error("An error occurred in updatePayment during the retrieve of the customer"));
            }
        }
        const isNonEmptyPhone = customerPhone || billing_address?.phone || customer?.phone || "";
        if (!razorpayId) {
            return this.buildError("razorpay id not supported", new Error("the phone number wasn't specified"));
        }
        if (razorpayId !== extra?.customer?.id) {
            const phone = isNonEmptyPhone;
            if (!phone) {
                this.logger.warn("phone number wasn't specified");
                return this.buildError("An error occurred in updatePayment during the retrieve of the customer", new Error("the phone number wasn't specified"));
            }
            const result = await this.initiatePayment(input);
            // TODO: update code block
            if (!result) {
                return this.buildError("An error occurred in updatePayment during the initiate of the new payment for the new customer", result);
            }
            return result;
        }
        else {
            if (!amount) {
                return this.buildError("amount  not valid", new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_DATA, "amount  not valid", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE));
            }
            if (!currency_code) {
                return this.buildError("currency code not known", new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_DATA, "currency code unknown", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE));
            }
            try {
                const id = extra?.id;
                let sessionOrderData = {
                    currency: "INR",
                };
                if (id) {
                    sessionOrderData = (await this.razorpay_.orders.fetch(id));
                    delete sessionOrderData.id;
                    delete sessionOrderData.created_at;
                }
                input.currency_code =
                    currency_code?.toUpperCase() ?? sessionOrderData?.currency ?? "INR";
                const newPaymentSessionOrder = (await this.initiatePayment(input));
                return { data: { ...newPaymentSessionOrder.data } };
            }
            catch (e) {
                return this.buildError("An error occurred in updatePayment", e);
            }
        }
    }
    async updatePaymentData(sessionId, data) {
        try {
            // Prevent from updating the amount from here as it should go through
            // the updatePayment method to perform the correct logic
            if (data.amount || data.currency) {
                throw new utils_1.MedusaError(utils_1.MedusaError.Types.INVALID_DATA, "Cannot update amount, use updatePayment instead");
            }
            try {
                const paymentSession = await this.razorpay_.payments.fetch(data.data.id);
                if (data.notes || data.data?.notes) {
                    const notes = data.notes || data.data?.notes;
                    const result = (await this.razorpay_.orders.edit(sessionId, {
                        notes: { ...paymentSession.notes, ...notes },
                    }));
                    return result;
                }
                else {
                    this.logger.warn("only notes can be updated in razorpay order");
                    return paymentSession;
                }
            }
            catch (e) {
                return data.data ?? data;
            }
        }
        catch (e) {
            return this.buildError("An error occurred in updatePaymentData", e);
        }
    }
    /*
    /**
     * Constructs Razorpay Webhook event
     * @param {object} data - the data of the webhook request: req.body
     * @param {object} signature - the Razorpay signature on the event, that
     *    ensures integrity of the webhook event
     * @return {object} Razorpay Webhook event
     */
    constructWebhookEvent(data, signature) {
        const provider = this.options_.providers?.find((p) => p.id == RazorpayBase.identifier);
        if (!provider && !this.options_.key_id) {
            throw new utils_1.MedusaError(utils_1.MedusaErrorTypes.INVALID_ARGUMENT, "razorpay not configured", utils_1.MedusaErrorCodes.CART_INCOMPATIBLE_STATE);
        }
        return razorpay_1.default.validateWebhookSignature(data, signature, this.options_.webhook_secret ?? provider?.options.webhook_secret);
    }
    buildError(message, e) {
        return {
            error: message,
            code: "code" in e ? e.code : "",
            detail: e.detail ?? e.message ?? "",
        };
    }
    async getWebhookActionAndData(webhookData) {
        const webhookSignature = webhookData.headers["x-razorpay-signature"];
        const webhookSecret = this.options_?.webhook_secret ||
            process.env.RAZORPAY_WEBHOOK_SECRET ||
            process.env.RAZORPAY_TEST_WEBHOOK_SECRET;
        const logger = this.logger;
        const data = webhookData.data;
        logger.info(`Received Razorpay webhook body as object : ${JSON.stringify(webhookData.data)}`);
        try {
            const validationResponse = razorpay_1.default.validateWebhookSignature(webhookData.rawData.toString(), webhookSignature, webhookSecret);
            // return if validation fails
            if (!validationResponse) {
                return { action: utils_1.PaymentActions.FAILED };
            }
        }
        catch (error) {
            logger.error(`Razorpay webhook validation failed : ${error}`);
            return { action: utils_1.PaymentActions.FAILED };
        }
        const paymentData = webhookData.data
            .payload?.payment?.entity;
        const event = data.event;
        const order = await this.razorpay_.orders.fetch(paymentData.order_id);
        /** sometimes this even fires before the order is updated in the remote system */
        const outstanding = (0, get_smallest_unit_1.getAmountFromSmallestUnit)(order.amount_paid == 0 ? paymentData.amount : order.amount_paid, paymentData.currency.toUpperCase());
        switch (event) {
            // payment authorization is handled in checkout flow. webhook not needed
            case "payment.captured":
                return {
                    action: utils_1.PaymentActions.SUCCESSFUL,
                    data: {
                        session_id: paymentData.notes.session_id,
                        amount: outstanding,
                    },
                };
            case "payment.authorized":
                return {
                    action: utils_1.PaymentActions.AUTHORIZED,
                    data: {
                        session_id: paymentData.notes.session_id,
                        amount: outstanding,
                    },
                };
            case "payment.failed":
                // TODO: notify customer of failed payment
                return {
                    action: utils_1.PaymentActions.FAILED,
                    data: {
                        session_id: paymentData.notes.session_id,
                        amount: outstanding,
                    },
                };
                break;
            default:
                return { action: utils_1.PaymentActions.NOT_SUPPORTED };
        }
    }
}
RazorpayBase.identifier = types_1.PaymentProviderKeys.RAZORPAY;
exports.default = RazorpayBase;
