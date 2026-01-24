import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  let token = JSON.parse(localStorage.getItem("profile") || 'null');
  token = token?.access;

  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error) => {
      if ([403].includes(error.status)) {
        let profile: any = localStorage.getItem("profile")
        if (profile) {
          profile = JSON.parse(profile);
          if (!profile.user.is_registration_complete) {
            localStorage.removeItem('profile'); // Clear token or user session
            router.navigate([""]);
          }
          else if (profile.user.is_registration_complete && !profile.user.is_subscription_complete && !profile.user.is_payment_complete) {
            router.navigate(["subscribe"]);
          }
          else {
            router.navigate(["unauthorized"]);
          }
        }
        else {
          router.navigate(["unauthorized"]);
        }
      }
      else if ([401].includes(error.status)) {
        localStorage.removeItem('profile'); // Clear token or user session
        //router.navigate([""]); // Redirect to logout or login page
      }
      return throwError(() => error);
    })
  );
};
