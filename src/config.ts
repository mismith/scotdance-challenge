import $package from '@/../package.json';

export { $package };
export const isDebugging = window.location.hostname === 'localhost' && 0;
