const requireContractedModule = (moduleName, permissionKey, getCache) => {
  return (req, res, next) => {
    next();
  };
};
export {
  requireContractedModule
};
