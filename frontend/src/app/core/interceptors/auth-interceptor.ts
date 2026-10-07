import { HttpInterceptorFn } from '@angular/common/http';
import { readToken } from '../services/token-storage';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = readToken();

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
