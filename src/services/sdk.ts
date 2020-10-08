import { BCMS } from '@becomes/cms-sdk';

export const sdk = BCMS({
  cms: {
    origin: '',
  },
  storage: {
    prfx: 'bcms',
  },
});
