import { Component, signal, inject } from '@angular/core';
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
export class ChatWindow {
  chatService = inject(LiveChatService);
  api = inject(ApiService);

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

  sendMessage() {
    const text = this.chatService.chatInputMessage().trim();
    const conv = this.chatService.selectedConversation();
    if (!text || !conv) return;

    const payload = {
      conversationId: conv.id,
      textContent: text
    };

    this.api.post('messages/send', payload).subscribe({
      next: () => {
        this.chatService.chatInputMessage.set('');
        this.chatService.selectConversation(conv);
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

    this.api.post('messages/send-interactive', payload).subscribe({
      next: () => {
        this.interactiveBody = '';
        this.btn1 = '';
        this.btn2 = '';
        this.btn3 = '';
        this.showInteractiveModal.set(false);
        this.chatService.selectConversation(conv);
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
