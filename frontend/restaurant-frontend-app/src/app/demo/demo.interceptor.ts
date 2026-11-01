import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { delay, of, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { demoBackend } from './demo-backend';

/**
 * Serves the whole API from an in-memory dataset when `environment.demoMode` is
 * enabled. Production builds keep `demoMode: false`, so this interceptor is a
 * no-op there and all requests go to the real backend.
 */
export const demoInterceptor: HttpInterceptorFn = (request, next) => {
  if (!environment.demoMode) {
    return next(request);
  }

  const apiBaseUrl = environment.backendUrl.replace(/\/$/, '');

  if (!request.url.startsWith(apiBaseUrl)) {
    return next(request);
  }

  const path = request.url.slice(apiBaseUrl.length).split('?')[0] || '/';
  const result = demoBackend.handle(request.method.toUpperCase(), path, request.params, request.body);

  if (result.status >= 400) {
    return throwError(
      () =>
        new HttpErrorResponse({
          status: result.status,
          statusText: 'Demo API error',
          error: result.body,
          url: request.url,
        }),
    ).pipe(delay(150));
  }

  return of(new HttpResponse({ status: result.status, body: result.body })).pipe(delay(150));
};
