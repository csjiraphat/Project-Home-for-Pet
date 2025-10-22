export type AgeMode = 'exact'|'range'|'any';

export const yMtoMonths = (y:number, m:number) => (y*12 + m);
export const monthsToY = (months:number) => Math.floor(months/12);
export const monthsToM = (months:number) => months % 12;

export const monthsToString = (months:number) => {
  const y = monthsToY(months), m = monthsToM(months);
  return `${y} ปี ${m} เดือน`;
};

export const parseThaiAge = (s = '') => {
  const y = Number(s.match(/(\d+)\s?ปี/)?.[1] || 0);
  const m = Number(s.match(/(\d+)\s?เดือน/)?.[1] || 0);
  return yMtoMonths(y, m);
};
