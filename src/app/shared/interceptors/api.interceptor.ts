import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';
import NProgress from 'nprogress';

export const apiInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  // Start the progress bar
  NProgress.start();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          // If it's a success response (status 200-299) and not a GET request, show SweetAlert
          if (req.method !== 'GET' && event.status >= 200 && event.status < 300) {
            Swal.fire({
              title: 'Success!',
              text: 'Action completed successfully.',
              icon: 'success',
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });
          }
        }
      },
      error: (error) => {
        // Optionally handle global errors here
        Swal.fire({
          title: 'Error!',
          text: error.message || 'Something went wrong.',
          icon: 'error',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true
        });
      }
    }),
    finalize(() => {
      // Complete the progress bar when the request completes or errors
      NProgress.done();
    })
  );
};
