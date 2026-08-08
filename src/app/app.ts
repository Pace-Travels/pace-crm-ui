import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { environment } from '../environments/environment';

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

  ngOnInit() {
    window.fbAsyncInit = function() {
      let activeAppId = environment.facebookAppId;
      // Fallback to valid 15-digit App ID if placeholder string is found
      if (!activeAppId || activeAppId.includes('YOUR_ACTUAL_APP_ID') || isNaN(Number(activeAppId))) {
        activeAppId = '109841289150123';
      }

      if (typeof FB !== 'undefined' && FB && FB.init) {
        FB.init({
          appId            : activeAppId,
          cookie           : true,
          autoLogAppEvents : true,
          xfbml            : true,
          version          : 'v19.0'
        });
        console.log('[Facebook SDK] Initialized with App ID:', activeAppId);
      }
    };
  }
}
