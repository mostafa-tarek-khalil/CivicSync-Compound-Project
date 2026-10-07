

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

const canUseStorage = (): boolean => {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
};

export function readToken(): string | null {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function writeToken(token: string): void {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}


export function readCachedUser<T>(): T | null {
  if (!canUseStorage()) {
    return null;
  }

  const raw = localStorage.getItem(USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    clearCachedUser();
    return null;
  }
}

export function writeCachedUser(user: unknown): void {
  if (!canUseStorage()) {
    return;
  }

  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearCachedUser(): void {
  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(USER_KEY);
}
