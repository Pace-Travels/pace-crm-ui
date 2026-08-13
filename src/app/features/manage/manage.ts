import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TemplatesView } from './components/templates-view/templates-view';
import { ApiService } from '../../shared/services/api.service';

import Swal from 'sweetalert2';

interface Widget {
  id?: number;
  widgetApiKey?: string;
  name: string;
  type: string; // 'WEB_CLIENT' | 'WHATSAPP_LINK'
  themeColor: string;
  welcomeText: string;
  preChatFields: string[];
  whatsappNumber?: string;
  predefinedText?: string;
  callPhoneNumber?: string;
  isAgentEnabled: boolean;
}

@Component({
  selector: 'app-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, TemplatesView],
  templateUrl: './manage.html',
  styleUrl: './manage.scss',
})
export class Manage implements OnInit {
  activeTab = signal('templates');

  // AI Chatbot Settings
  isAgentEnabled = signal(false);
  modelName = signal('gemini-1.5-pro');
  geminiApiKey = signal('');
  systemPrompt = signal('');

  // Web Widgets List
  widgets = signal<Widget[]>([]);
  showAddWidgetForm = signal(false);
  editingWidget = signal<Widget | null>(null);

  // Widget Form Fields
  wName = '';
  wType = 'WEB_CLIENT';
  wThemeColor = '#0b494d';
  wWelcomeText = 'Hello! How can we help you today?';
  wPreChatFieldsText = ''; // Comma-separated
  wWhatsappNumber = '';
  wPredefinedText = '';
  wCallPhoneNumber = '';
  wIsAgentEnabled = false;

  // FCM Token Generator Fields
  fcmName = '';
  fcmType = 'WEB_CLIENT';
  fcmThemeColor = '#0b494d';
  fcmWelcomeText = 'Hello! How can we help you today?';
  fcmPreChatFieldsText = '';
  fcmCallPhoneNumber = '';

  // Store newly generated token for copying
  generatedToken = signal<string>('');

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.fetchAISettings();
    this.fetchWidgets();
  }

  fetchAISettings() {
    this.api.get('/aipersonas/settings').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.isAgentEnabled.set(res.data.isAgentEnabled);
          this.modelName.set(res.data.modelName || 'gemini-1.5-pro');
          this.geminiApiKey.set(res.data.geminiApiKey || '');
          this.systemPrompt.set(res.data.systemPrompt || '');
        }
      }
    });
  }

  saveAISettings() {
    const payload = {
      isAgentEnabled: this.isAgentEnabled(),
      modelName: this.modelName(),
      geminiApiKey: this.geminiApiKey(),
      systemPrompt: this.systemPrompt()
    };

    this.api.post('/aipersonas/settings', payload).subscribe({
      next: () => {
        Swal.fire('Success', 'Gemini AI agent settings saved successfully!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to save AI settings: ' + err.message, 'error');
      }
    });
  }

  // --- Widgets Configuration Section ---

  fetchWidgets() {
    this.api.get<any>('widget/list').subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.widgets.set(res.data);
        }
      }
    });
  }

  openNewWidgetForm() {
    this.editingWidget.set(null);
    this.wName = '';
    this.wType = 'WEB_CLIENT';
    this.wThemeColor = '#0b494d';
    this.wWelcomeText = 'Hello! How can we help you today?';
    this.wPreChatFieldsText = '';
    this.wWhatsappNumber = '';
    this.wPredefinedText = '';
    this.wCallPhoneNumber = '';
    this.wIsAgentEnabled = false;
    this.showAddWidgetForm.set(true);
  }

  openEditWidgetForm(w: Widget) {
    this.editingWidget.set(w);
    this.wName = w.name;
    this.wType = w.type;
    this.wThemeColor = w.themeColor;
    this.wWelcomeText = w.welcomeText;
    this.wPreChatFieldsText = (w.preChatFields || []).join(', ');
    this.wWhatsappNumber = w.whatsappNumber || '';
    this.wPredefinedText = w.predefinedText || '';
    this.wCallPhoneNumber = w.callPhoneNumber || '';
    this.wIsAgentEnabled = w.isAgentEnabled;
    this.showAddWidgetForm.set(true);
  }

  saveWidget() {
    if (!this.wName) {
      Swal.fire('Error', 'Widget name is required!', 'error');
      return;
    }

    const preChatFields = this.wPreChatFieldsText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      name: this.wName,
      type: this.wType,
      themeColor: this.wThemeColor,
      welcomeText: this.wWelcomeText,
      preChatFields,
      whatsappNumber: this.wWhatsappNumber || null,
      predefinedText: this.wPredefinedText || null,
      callPhoneNumber: this.wCallPhoneNumber || null,
      isAgentEnabled: this.wIsAgentEnabled
    };

    const edit = this.editingWidget();
    if (edit && edit.id) {
      this.api.put(`widget/update/${edit.id}`, payload).subscribe({
        next: () => {
          this.showAddWidgetForm.set(false);
          this.fetchWidgets();
          Swal.fire('Updated', 'Widget configurations updated!', 'success');
        },
        error: (err: any) => Swal.fire('Error', 'Failed to update widget: ' + err.message, 'error')
      });
    } else {
      this.api.post('widget/add', payload).subscribe({
        next: () => {
          this.showAddWidgetForm.set(false);
          this.fetchWidgets();
          Swal.fire('Created', 'New Web Widget created successfully!', 'success');
        },
        error: (err: any) => Swal.fire('Error', 'Failed to create widget: ' + err.message, 'error')
      });
    }
  }

  deleteWidget(id?: number) {
    if (!id) return;
    Swal.fire({
      title: 'Delete Web Widget?',
      text: 'Are you sure you want to delete this widget integration?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, Delete'
    }).then((res) => {
      if (res.isConfirmed) {
        this.api.delete(`widget/delete/${id}`).subscribe({
          next: () => {
            this.fetchWidgets();
            Swal.fire('Deleted', 'Widget integration removed.', 'success');
          }
        });
      }
    });
  }

  getEmbedCode(apiKey?: string): string {
    const apiHost = this.api.baseUrl.replace(/\/api\/v1\/?$/, '');
    return `<script src="${apiHost}/sdk/widget.js" data-api-key="${apiKey || 'YOUR_KEY'}"></script>`;
  }

  // --- FCM Token Generator Section ---

  saveToken() {
    if (!this.fcmName) {
      Swal.fire('Error', 'Widget Config Name is required!', 'error');
      return;
    }

    const preChatFields = this.fcmPreChatFieldsText
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const payload = {
      name: this.fcmName,
      type: this.fcmType,
      themeColor: this.fcmThemeColor,
      welcomeText: this.fcmWelcomeText,
      preChatFields,
      callPhoneNumber: this.fcmCallPhoneNumber || null
    };

    this.api.post('usertoken/add', payload).subscribe({
      next: (res: any) => {
        // Response me jo identityToken mila hai use signal me set karein
        const token = res?.data?.identityToken || '';
        this.generatedToken.set(token);

        Swal.fire('Success', 'FCM Token generated successfully!', 'success');
      },
      error: (err: any) => {
        Swal.fire('Error', 'Failed to generate token: ' + err.message, 'error');
      }
    });
  }

  copyTokenToClipboard() {
    const token = this.generatedToken();
    if (!token) return;

    navigator.clipboard.writeText(token).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Token copied to clipboard!',
        showConfirmButton: false,
        timer: 2000
      });
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }
}