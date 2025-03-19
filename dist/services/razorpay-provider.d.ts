import RazorpayBase from "../../src/core/razorpay-base";
import { PaymentIntentOptions } from "../../src/types";
declare class RazorpayProviderService extends RazorpayBase {
    static identifier: string;
    constructor(_: any, options: any);
    get paymentIntentOptions(): PaymentIntentOptions;
}
export default RazorpayProviderService;
//# sourceMappingURL=razorpay-provider.d.ts.map