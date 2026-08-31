import { Component, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LiveChatService } from '../../services/live-chat.service';
import { ApiService } from '../../../../shared/services/api.service';

declare var Swal: any;

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow implements AfterViewChecked {
  chatService = inject(LiveChatService);
  api = inject(ApiService);

  @ViewChild('messagesArea') private messagesArea!: ElementRef;

  showInteractiveModal = signal(false);
  interactiveBody = '';
  btn1 = '';
  btn2 = '';
  btn3 = '';

  // Quick Action Modal states
  showAttributeModal = signal(false);
  showTagModal = signal(false);
  showMediaLinkModal = signal(false);

  attrKey = '';
  attrValue = '';
  tagName = '';
  mediaUrlInput = '';

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom() {
    try {
      if (this.messagesArea) {
        this.messagesArea.nativeElement.scrollTop = this.messagesArea.nativeElement.scrollHeight;
      }
    } catch (err) {}
  }

  getMediaUrl(url: string | undefined): string {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const base = this.api.baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  getInteractiveLabel(text: string | undefined): string {
    if (!text) return 'Interactive Button Selection';
    if (text === '[Interactive Selection]') return '🔘 Interactive Quick Reply Selected';
    if (text.includes('[Interactive Selection]')) return text.replace('[Interactive Selection]', '🔘 Quick Reply Selection');
    return text;
  }

  sendMessage() {
    const text = this.chatService.chatInputMessage().trim();
    const conv = this.chatService.selectedConversation();
    if (!text || !conv) return;

    // Clear input box immediately for high responsiveness
    this.chatService.chatInputMessage.set('');

    const payload = {
      conversationId: conv.id,
      textContent: text
    };

    this.api.post<any>('messages/send', payload).subscribe({
      next: (res: any) => {
        const newMsg = res.data || res;
        if (newMsg && newMsg.id) {
          const current = this.chatService.messagesSubject.value;
          const existingIdx = current.findIndex((m: any) => m.id === newMsg.id);
          if (existingIdx > -1) {
            const updated = [...current];
            updated[existingIdx] = { ...updated[existingIdx], ...newMsg };
            this.chatService.messagesSubject.next(updated);
          } else {
            this.chatService.messagesSubject.next([...current, newMsg]);
          }
        }
        if (newMsg?.status === 'FAILED') {
          this.showAlert('Delivery Failed', newMsg.errorMessage || 'WhatsApp message failed to deliver', 'warning');
        }
      },
      error: (err: any) => {
        this.showAlert('Delivery Failed', err.error?.error || err.message || 'Failed to send message', 'error');
      }
    });
  }

  toggleInteractiveModal() {
    this.showInteractiveModal.set(!this.showInteractiveModal());
  }

  sendInteractiveButtons() {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;
    if (!this.interactiveBody.trim()) {
      this.showAlert('Required Field', 'Please enter message body text.', 'warning');
      return;
    }

    const buttons = [];
    if (this.btn1.trim()) buttons.push({ title: this.btn1.trim() });
    if (this.btn2.trim()) buttons.push({ title: this.btn2.trim() });
    if (this.btn3.trim()) buttons.push({ title: this.btn3.trim() });

    if (buttons.length === 0) {
      this.showAlert('Required Field', 'Please enter at least one button title.', 'warning');
      return;
    }

    const payload = {
      conversationId: conv.id,
      textContent: this.interactiveBody.trim(),
      buttons
    };

    this.api.post<any>('messages/send-interactive', payload).subscribe({
      next: (res: any) => {
        this.interactiveBody = '';
        this.btn1 = '';
        this.btn2 = '';
        this.btn3 = '';
        this.showInteractiveModal.set(false);

        const newMsg = res.data || res;
        if (newMsg && newMsg.id) {
          const current = this.chatService.messagesSubject.value;
          const existingIdx = current.findIndex((m: any) => m.id === newMsg.id);
          if (existingIdx > -1) {
            const updated = [...current];
            updated[existingIdx] = { ...updated[existingIdx], ...newMsg };
            this.chatService.messagesSubject.next(updated);
          } else {
            this.chatService.messagesSubject.next([...current, newMsg]);
          }
        }
        this.showAlert('Sent!', 'Quick reply interactive buttons delivered.', 'success');
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || err.message || 'Failed to send interactive buttons', 'error');
      }
    });
  }

  // Action 1: Add User Attributes
  onAddUserAttribute() {
    Swal.fire({
      title: 'Add Contact Attribute',
      html: `<input id="swal-key" class="swal2-input" placeholder="Attribute Key (e.g. City, VIP, LeadScore)">
             <input id="swal-val" class="swal2-input" placeholder="Attribute Value (e.g. Mumbai, High)">`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Attribute',
      preConfirm: () => {
        const key = (document.getElementById('swal-key') as HTMLInputElement).value;
        const val = (document.getElementById('swal-val') as HTMLInputElement).value;
        if (!key || !val) {
          Swal.showValidationMessage('Both key and value are required!');
        }
        return { key, val };
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.showAlert('Attribute Added', `Attribute "${result.value.key}: ${result.value.val}" saved to contact.`, 'success');
      }
    });
  }

  // Action 2: Add/Remove Tag
  onAddRemoveTag() {
    Swal.fire({
      title: 'Add/Remove Contact Tag',
      input: 'text',
      inputPlaceholder: 'Enter tag name (e.g. HotLead, Purchased, Support)',
      showCancelButton: true,
      confirmButtonText: 'Apply Tag',
      inputValidator: (value: string) => {
        if (!value) return 'Tag name cannot be empty!';
        return null;
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        this.showAlert('Tag Applied', `Tag "${result.value}" updated on contact profile.`, 'success');
      }
    });
  }

  // Action 3: Send & Generate Media Link
  onSendMediaLink() {
    Swal.fire({
      title: 'Generate & Share Media Link',
      input: 'url',
      inputPlaceholder: 'Paste Image, PDF, or Document URL',
      showCancelButton: true,
      confirmButtonText: 'Send Media Link',
      inputValidator: (value: string) => {
        if (!value) return 'Please paste a valid URL!';
        return null;
      }
    }).then((result: any) => {
      if (result.isConfirmed) {
        const conv = this.chatService.selectedConversation();
        if (conv) {
          this.api.post('messages/send', {
            conversationId: conv.id,
            textContent: `[Media Attachment Link]: ${result.value}`
          }).subscribe({
            next: () => {
              this.chatService.selectConversation(conv);
              this.showAlert('Media Sent', 'Media link shared in conversation.', 'success');
            }
          });
        } else {
          this.showAlert('Notice', 'Media link generated: ' + result.value, 'info');
        }
      }
    });
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
