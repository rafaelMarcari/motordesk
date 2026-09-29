const isCompanyActive = (company) => {
  if (!company) return true;
  return company.status !== "inactive";
};
export {
  isCompanyActive
};
