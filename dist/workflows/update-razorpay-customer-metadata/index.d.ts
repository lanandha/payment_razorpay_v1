export type UpdateRazorpayCustomerMetadataInput = {
    medusa_customer_id: string;
} & Record<string, unknown>;
export declare const updateRazorpayCustomerMetadataWorkflow: import("@medusajs/framework/workflows-sdk").ReturnWorkflow<{
    medusa_customer_id: string;
} & Record<string, unknown>, {
    customer: (import("@medusajs/types").CustomerDTO | import("@medusajs/framework/workflows-sdk").WorkflowData<import("@medusajs/types").CustomerDTO>) & import("@medusajs/types").CustomerDTO;
    registerResponse: (import("@medusajs/types").CustomerDTO | import("@medusajs/framework/workflows-sdk").WorkflowData<import("@medusajs/types").CustomerDTO>) & import("@medusajs/types").CustomerDTO;
}, []>;
//# sourceMappingURL=index.d.ts.map