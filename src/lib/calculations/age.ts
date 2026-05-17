export function ageInMonths(birthDate: Date, referenceDate: Date = new Date()): number {
  const years = referenceDate.getFullYear() - birthDate.getFullYear();
  const months = referenceDate.getMonth() - birthDate.getMonth();
  const days = referenceDate.getDate() - birthDate.getDate();
  return years * 12 + months + (days < 0 ? -1 : 0);
}

export function ageInYears(birthDate: Date, referenceDate: Date = new Date()): number {
  return Math.floor(ageInMonths(birthDate, referenceDate) / 12);
}
