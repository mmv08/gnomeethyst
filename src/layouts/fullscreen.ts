import { assignAll, type DynamicLayout } from './types';

export const fullscreenLayout: DynamicLayout = {
  key: 'fullscreen',
  name: 'Fullscreen',
  assign(windows, workArea) {
    return assignAll(windows, workArea);
  },
};
