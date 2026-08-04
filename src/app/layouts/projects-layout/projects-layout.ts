import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-projects-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="projects-layout">
        <header class="top-bar">
            <div class="logo">
                <i class="fa-solid fa-bolt text-green"></i> <span class="logo-text">Pace Messenger</span>
            </div>
            <div class="profile-icon">I</div>
        </header>
        <main class="main-content">
            <router-outlet></router-outlet>
        </main>
    </div>
  `,
  styles: [`
    .projects-layout {
        min-height: 100vh;
        background: #f8fafc;
        font-family: 'Inter', sans-serif;
    }
    .top-bar {
        height: 64px;
        background: white;
        border-bottom: 1px solid #eaeaea;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 48px;

        .logo {
            font-size: 20px;
            font-weight: bold;
            color: #1a1a1a;
            display: flex;
            align-items: center;
            gap: 8px;

            .text-green { color: #009933; }
        }

        .profile-icon {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            color: #333;
        }
    }
    .main-content {
        padding: 48px;
        max-width: 1200px;
        margin: 0 auto;
    }
  `]
})
export class ProjectsLayout {}
