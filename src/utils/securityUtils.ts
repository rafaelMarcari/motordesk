export const isCompanyActive = (company: any): boolean => {
  if (!company) return true;
  return company.status !== 'inactive';
};
