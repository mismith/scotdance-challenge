// eslint-disable-next-line import/prefer-default-export
export const toDateStr = (date: Date) => date.toISOString().replace(/T.*?$/i, '');
