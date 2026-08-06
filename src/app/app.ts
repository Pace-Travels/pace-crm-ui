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
      FB.init({
        appId            : environment.facebookAppId,
        autoLogAppEvents : true,
        xfbml            : true,
        version          : 'v19.0'
      });
    };
  }
}
