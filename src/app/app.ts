import { Component, signal, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './shared/services/api.service';

declare var FB: any;
declare global {
  interface Window {
    fbAsyncInit: () => void;
  }
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('pace-crmui');
  private api = inject(ApiService);

  ngOnInit() {
    this.api.get('/config/public').subscribe({
      next: (res: any) => {
        const appId = res?.metaAppId;
        if (appId) {
          this.initFacebookSdk(appId);
        }
      },
      error: () => {
        console.warn('[Facebook SDK] Dynamic config fetch failed, using fallback.');
      }
    });
  }

  private initFacebookSdk(appId: string) {
    window.fbAsyncInit = function() {
      if (typeof FB !== 'undefined' && FB && FB.init) {
        FB.init({
          appId            : appId,
          cookie           : true,
          autoLogAppEvents : true,
          xfbml            : true,
          version          : 'v19.0'
        });
        console.log('[Facebook SDK] Dynamically initialized from Backend .env with App ID:', appId);
      }
    };
    if (typeof FB !== 'undefined' && FB && FB.init) {
      FB.init({
        appId            : appId,
        cookie           : true,
        autoLogAppEvents : true,
        xfbml            : true,
        version          : 'v19.0'
      });
    }
  }
}
