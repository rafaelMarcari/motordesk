export const requireAuth = (req: any, res: any, next: any) => {
  // Allow all requests to pass through; context extraction occurs in route handlers
  next();
};
