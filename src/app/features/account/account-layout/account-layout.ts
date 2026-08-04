import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

@Component({
  selector: 'app-account-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <div class="account-layout">
        <div class="inner-sidebar">
            <div class="sidebar-header">
                <h2>Your Account</h2>
            </div>
            <nav class="nav-menu">
                <a class="nav-item active">
                    <i class="fa-regular fa-user"></i> Your Profile
                </a>
                <a class="nav-item">
                    <i class="fa-solid fa-lock"></i> Two Factor Authentication
                </a>
            </nav>
        </div>
        
        <div class="main-content">
            <router-outlet></router-outlet>
        </div>
    </div>
  `,
  styles: [`
    .account-layout {
        display: flex;
        min-height: 100vh;
        background: #f8fafc;
    }
    
    .inner-sidebar {
        width: 260px;
        background: white;
        border-right: 1px solid #eaeaea;
        padding: 24px 0;

        .sidebar-header {
            padding: 0 24px;
            margin-bottom: 24px;
            
            h2 {
                font-size: 18px;
                color: #1a1a1a;
                margin: 0;
            }
        }

        .nav-menu {
            display: flex;
            flex-direction: column;

            .nav-item {
                padding: 12px 24px;
                display: flex;
                align-items: center;
                gap: 12px;
                color: #1a1a1a;
                text-decoration: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;

                i { font-size: 14px; width: 16px; text-align: center; }

                &:hover { background: #f8fafc; }

                &.active {
                    background: #e9f5f0;
                    color: #0b494d;
                    border-right: 3px solid #0b494d;
                }
            }
        }
    }

    .main-content {
        flex: 1;
        padding: 32px 48px;
        background: #f8fafc;
    }
  `]
})
export class AccountLayout {}
