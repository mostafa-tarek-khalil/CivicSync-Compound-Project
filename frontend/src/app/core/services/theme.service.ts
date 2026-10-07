import { Injectable, signal } from '@angular/core';

const THEME_KEY = 'civicsync-theme';


@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly darkState = signal(false);

  
  readonly darkMode = this.darkState.asReadonly();

  constructor() {
    this.setDark(this.resolveInitialTheme(), { persist: false });
  }

  
  get isDark(): boolean {
    return this.darkState();
  }

  toggleTheme(): void {
    this.setDark(!this.darkState());
  }

  setDark(isDark: boolean, options: { persist?: boolean } = {}): void {
    const { persist = true } = options;

    this.darkState.set(isDark);

    if (persist && typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    }

    this.applyThemeClass(isDark);
  }

  private resolveInitialTheme(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;


    if (localStorage.getItem('theme') === 'dark') return true;
    if (localStorage.getItem('civicsync-dark-mode') === 'true') return true;

    return false;
  }

  private applyThemeClass(isDark: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.classList.toggle('dark-mode', isDark);
  }
}
