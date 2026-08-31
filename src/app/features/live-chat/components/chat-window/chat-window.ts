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
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Add Contact Attribute',
      html: `
        <div style="text-align: left;">
          <input id="swal-key" class="swal2-input" placeholder="Attribute Key (e.g. City, VIP, LeadScore)">
          <input id="swal-val" class="swal2-input" placeholder="Attribute Value (e.g. Mumbai, High)">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Save Attribute',
      preConfirm: () => {
        const key = (document.getElementById('swal-key') as HTMLInputElement).value.trim();
        const val = (document.getElementById('swal-val') as HTMLInputElement).value.trim();
        if (!key || !val) {
          Swal.showValidationMessage('Both key and value are required!');
          return false;
        }
        return { key, val };
      }
    }).then((result: any) => {
      if (result.isConfirmed && result.value) {
        const { key, val } = result.value;
        this.api.post<any>('messages/add', {
          conversationId: conv.id,
          senderType: 'SYSTEM',
          messageType: 'TEXT',
          content: `📌 Attribute added: ${key} = ${val}`,
          textContent: `📌 Attribute added: ${key} = ${val}`
        }).subscribe({
          next: (mRes: any) => {
            const newMsg = mRes.data || mRes;
            if (newMsg && newMsg.id) {
              const current = this.chatService.messagesSubject.value;
              this.chatService.messagesSubject.next([...current, newMsg]);
            }
          }
        });

        this.showAlert('Attribute Added', `Attribute "${key}: ${val}" saved.`, 'success');
      }
    });
  }

  // Action 2: Add/Remove Tag
  onAddRemoveTag() {
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Apply Contact Tag',
      input: 'text',
      inputPlaceholder: 'Enter tag name (e.g. HotLead, VIP, Support, Booked)',
      showCancelButton: true,
      confirmButtonText: 'Apply Tag',
      inputValidator: (value: string) => {
        if (!value || !value.trim()) return 'Tag name cannot be empty!';
        return null;
      }
    }).then((result: any) => {
      if (result.isConfirmed && result.value) {
        const tag = result.value.trim();
        const contactId = conv.contactId || (conv.Contact as any)?.id || conv.id;

        // 1. Save ContactTag in Database
        this.api.post('contacttags/add', { contactId, tag }).subscribe({
          next: () => {
            // 2. Post System notification message to Live Chat stream
            this.api.post<any>('messages/add', {
              conversationId: conv.id,
              senderType: 'SYSTEM',
              messageType: 'TEXT',
              content: `🏷️ Tag "${tag}" added to contact profile`,
              textContent: `🏷️ Tag "${tag}" added to contact profile`
            }).subscribe({
              next: (mRes: any) => {
                const newMsg = mRes.data || mRes;
                if (newMsg && newMsg.id) {
                  const current = this.chatService.messagesSubject.value;
                  this.chatService.messagesSubject.next([...current, newMsg]);
                }
              }
            });

            this.showAlert('Tag Applied', `Tag "${tag}" updated on contact profile.`, 'success');
          },
          error: (err: any) => {
            this.showAlert('Error', err.error?.error || err.message || 'Failed to save tag', 'error');
          }
        });
      }
    });
  }

  // Action 3: Send & Share Rich Media Link/Attachment
  onSendMediaLink() {
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }

    Swal.fire({
      title: 'Share Media Attachment',
      html: `
        <div style="text-align: left; font-size: 13px;">
          <label style="font-weight: bold; margin-bottom: 4px; display: block; color: #334155;">Select Media Type:</label>
          <select id="swal-media-type" class="swal2-select" style="width: 100%; margin-bottom: 12px; padding: 8px; font-size: 13px;">
            <option value="IMAGE">📷 Image (JPG, PNG, WebP)</option>
            <option value="PDF">📄 PDF Document</option>
            <option value="AUDIO">🎵 Audio Track (MP3, OGG)</option>
          </select>
          <label style="font-weight: bold; margin-bottom: 4px; display: block; color: #334155;">Media URL:</label>
          <input id="swal-media-url" class="swal2-input" placeholder="Paste Image, PDF, or Audio URL" style="width: 100%; box-sizing: border-box; margin-bottom: 12px; font-size: 13px;">
          <label style="font-weight: bold; margin-bottom: 4px; display: block; color: #334155;">Caption / Description (Optional):</label>
          <input id="swal-media-caption" class="swal2-input" placeholder="Enter optional caption..." style="width: 100%; box-sizing: border-box; font-size: 13px;">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Attach & Share Media',
      preConfirm: () => {
        const type = (document.getElementById('swal-media-type') as HTMLSelectElement).value;
        const url = (document.getElementById('swal-media-url') as HTMLInputElement).value.trim();
        const caption = (document.getElementById('swal-media-caption') as HTMLInputElement).value.trim();
        if (!url) {
          Swal.showValidationMessage('Please provide a valid Media URL!');
          return false;
        }
        return { type, url, caption };
      }
    }).then((result: any) => {
      if (result.isConfirmed && result.value) {
        const { type, url, caption } = result.value;
        const payload = {
          conversationId: conv.id,
          senderType: 'HUMAN',
          messageType: type,
          content: url,
          mediaUrl: url,
          textContent: caption || `[Media Attachment: ${type}]`,
          direction: 'OUTBOUND'
        };

        this.api.post<any>('messages/add', payload).subscribe({
          next: (res: any) => {
            const newMsg = res.data || res;
            if (newMsg && newMsg.id) {
              const current = this.chatService.messagesSubject.value;
              this.chatService.messagesSubject.next([...current, newMsg]);
            }
            this.showAlert('Media Shared', `${type} attachment added to conversation.`, 'success');
          },
          error: (err: any) => {
            this.showAlert('Error', err.error?.error || err.message || 'Failed to attach media', 'error');
          }
        });
      }
    });
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
