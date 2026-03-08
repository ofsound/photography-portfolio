export type AdminThemeMode = 'light' | 'dark' | 'system';

let adminThemeMode = $state<AdminThemeMode>('system');

export const adminThemeModeStore = {
  get value() {
    return adminThemeMode;
  },
  set(newValue: AdminThemeMode) {
    adminThemeMode = newValue;
  },
};
