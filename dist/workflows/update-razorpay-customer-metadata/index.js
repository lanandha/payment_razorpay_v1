"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRazorpayCustomerMetadataWorkflow = void 0;
const workflows_sdk_1 = require("@medusajs/framework/workflows-sdk");
const update_customer_1 = require("./steps/update-customer");
exports.updateRazorpayCustomerMetadataWorkflow = (0, workflows_sdk_1.createWorkflow)("update-razorpay-customer-metadata", (input) => {
    const { customer, registerResponse } = (0, update_customer_1.updateCustomerMetadataStep)(input);
    return new workflows_sdk_1.WorkflowResponse({
        customer,
        registerResponse
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvd29ya2Zsb3dzL3VwZGF0ZS1yYXpvcnBheS1jdXN0b21lci1tZXRhZGF0YS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxxRUFHMkM7QUFFM0MsNkRBQXFFO0FBTXhELFFBQUEsc0NBQXNDLEdBQUcsSUFBQSw4QkFBYyxFQUNoRSxtQ0FBbUMsRUFDbkMsQ0FBQyxLQUEwQyxFQUFFLEVBQUU7SUFDM0MsTUFBTSxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxHQUNoQyxJQUFBLDRDQUEwQixFQUFDLEtBQUssQ0FBQyxDQUFDO0lBRXRDLE9BQU8sSUFBSSxnQ0FBZ0IsQ0FBQztRQUN4QixRQUFRO1FBQ1IsZ0JBQWdCO0tBQ25CLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FDSixDQUFDIn0=