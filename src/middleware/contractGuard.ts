export const requireContractedModule = (moduleName: string, permissionKey: string, getCache?: () => any) => {
  return (req: any, res: any, next: any) => {
    next();
  };
};
