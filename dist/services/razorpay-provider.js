"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const razorpay_base_1 = __importDefault(require("../core/razorpay-base"));
const types_1 = require("../types");
class RazorpayProviderService extends razorpay_base_1.default {
    constructor(_, options) {
        super(_, options);
    }
    get paymentIntentOptions() {
        return {};
    }
}
RazorpayProviderService.identifier = types_1.PaymentProviderKeys.RAZORPAY;
exports.default = RazorpayProviderService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF6b3JwYXktcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2VydmljZXMvcmF6b3JwYXktcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSwwRUFBaUQ7QUFDakQsb0NBQXFFO0FBRXJFLE1BQU0sdUJBQXdCLFNBQVEsdUJBQVk7SUFHOUMsWUFBWSxDQUFDLEVBQUUsT0FBTztRQUNsQixLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRCxJQUFJLG9CQUFvQjtRQUNwQixPQUFPLEVBQVMsQ0FBQztJQUNyQixDQUFDOztBQVJNLGtDQUFVLEdBQUcsMkJBQW1CLENBQUMsUUFBUSxDQUFDO0FBV3JELGtCQUFlLHVCQUF1QixDQUFDIn0=