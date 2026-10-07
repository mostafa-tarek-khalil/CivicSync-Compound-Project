
export const environment = {
  production: false,


  apiBaseUrl: 'http://localhost:3000',


  apiUrl: 'http://localhost:3000/api',
};


export function resolveUploadUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }


  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }

  return `${environment.apiBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}