
export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: any;
};

export class FirestorePermissionError extends Error {
  context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    super(`FirestoreError: Missing or insufficient permissions: ${JSON.stringify(context, null, 2)}`);
    this.name = 'FirestorePermissionError';
    this.context = context;
  }
}
