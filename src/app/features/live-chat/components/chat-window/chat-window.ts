import { Component, signal, inject, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LiveChatService } from '../../services/live-chat.service';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';
import { MediaModal, MediaPayload } from '../media-modal/media-modal';
import { TagModal } from '../tag-modal/tag-modal';
import { PayModal, PaymentRequestPayload } from '../pay-modal/pay-modal';
import { EmojiStickerPicker } from '../emoji-sticker-picker/emoji-sticker-picker';
import { SendTemplateModal, TemplateDispatchPayload } from '../template-modal/template-modal';
import { AssetGalleryPicker } from '../../../campaigns/components/asset-gallery-picker/asset-gallery-picker';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MediaModal, TagModal, PayModal, EmojiStickerPicker, SendTemplateModal, AssetGalleryPicker],
  templateUrl: './chat-window.html',
  styleUrl: './chat-window.scss',
})
export class ChatWindow implements AfterViewChecked {
  chatService = inject(LiveChatService);
  api = inject(ApiService);

  @ViewChild('messagesArea') private messagesArea!: ElementRef;

  showInteractiveModal = signal(false);
  isEmojiPickerOpen = signal(false);
  interactiveBody = '';
  btn1 = '';
  btn2 = '';
  btn3 = '';

  // Rich Modal Visibility Signals
  isMediaModalOpen = signal(false);
  isTagModalOpen = signal(false);
  isPayModalOpen = signal(false);
  isTemplateModalOpen = signal(false);
  isAssetGalleryOpen = signal(false);

  contactTags = signal<string[]>([]);

  toggleEmojiPicker() {
    this.isEmojiPickerOpen.set(!this.isEmojiPickerOpen());
  }

  handleSelectEmoji(emoji: string) {
    const current = this.chatService.chatInputMessage();
    this.chatService.chatInputMessage.set(current + emoji);
  }

  handleSelectSticker(stickerUrl: string) {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;

    const isGif = stickerUrl.endsWith('.gif');
    const msgType = isGif ? 'GIF' : 'STICKER';

    const payload = {
      conversationId: conv.id,
      senderType: 'HUMAN',
      messageType: msgType,
      content: stickerUrl,
      mediaUrl: stickerUrl,
      textContent: `[${msgType} Attachment]`,
      direction: 'OUTBOUND'
    };

    this.api.post<any>('messages/add', payload).subscribe({
      next: (res: any) => {
        const newMsg = res.data || res;
        if (newMsg && newMsg.id) {
          const current = this.chatService.messagesSubject.value;
          this.chatService.messagesSubject.next([...current, newMsg]);
        }
        this.showAlert('Sent', `${msgType} delivered.`, 'success');
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || err.message || 'Failed to send sticker', 'error');
      }
    });
  }

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
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('[') || trimmed.includes('Attachment:')) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    const base = this.api.baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  getInteractiveLabel(text: string | undefined): string {
    if (!text) return 'Interactive Button Selection';
    if (text === '[Interactive Selection]') return '🔘 Interactive Quick Reply Selected';
    if (text.includes('[Interactive Selection]')) return text.replace('[Interactive Selection]', '🔘 Quick Reply Selection');
    return text;
  }

  // Active Quoted Reply Signal
  replyingToMessage = signal<any | null>(null);

  setReplyTo(msg: any) {
    this.replyingToMessage.set(msg);
  }

  cancelReply() {
    this.replyingToMessage.set(null);
  }

  scrollToMessage(targetId: number | string | undefined) {
    if (!targetId) return;
    const targetStr = String(targetId);
    
    // Find element by msg-{id} or wamid-{whatsappMessageId}
    const elem = document.getElementById(`msg-${targetStr}`) || document.getElementById(`wamid-${targetStr}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Trigger CSS pulse highlight animation
      elem.classList.remove('highlight-pulse');
      void elem.offsetWidth; // Force DOM reflow
      elem.classList.add('highlight-pulse');
      
      setTimeout(() => {
        elem.classList.remove('highlight-pulse');
      }, 1800);
    }
  }

  sendMessage() {
    const text = this.chatService.chatInputMessage().trim();
    const conv = this.chatService.selectedConversation();
    if (!text || !conv) return;

    const replyMsg = this.replyingToMessage();

    this.chatService.chatInputMessage.set('');
    this.cancelReply();

    const payload: any = {
      conversationId: conv.id,
      textContent: text
    };

    if (replyMsg && replyMsg.id) {
      payload.replyToMessageId = replyMsg.id;
    }

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

  // --- Rich Media Modal Handlers ---
  openMediaModal() {
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }
    this.isMediaModalOpen.set(true);
  }

  handleSendMedia(media: MediaPayload) {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;

    const payload = {
      conversationId: conv.id,
      senderType: 'HUMAN',
      messageType: media.messageType,
      content: media.mediaUrl,
      mediaUrl: media.mediaUrl,
      textContent: media.caption || `[Media Attachment: ${media.messageType}]`,
      direction: 'OUTBOUND'
    };

    this.api.post<any>('messages/add', payload).subscribe({
      next: (res: any) => {
        const newMsg = res.data || res;
        if (newMsg && newMsg.id) {
          const current = this.chatService.messagesSubject.value;
          this.chatService.messagesSubject.next([...current, newMsg]);
        }
        this.showAlert('Media Shared', `${media.messageType} attachment sent successfully.`, 'success');
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || err.message || 'Failed to send media', 'error');
      }
    });
  }

  // --- Tag Modal Handlers ---
  openTagModal() {
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }

    const contactId = conv.contactId || (conv.Contact as any)?.id;
    if (contactId) {
      this.api.get<any>(`contacttags/list/${contactId}`).subscribe({
        next: (res: any) => {
          const list = res.data || res || [];
          this.contactTags.set(list.map((t: any) => t.tag || t));
        },
        error: () => this.contactTags.set([])
      });
    }

    this.isTagModalOpen.set(true);
  }

  handleAddTag(tag: string) {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;

    const contactId = conv.contactId || (conv.Contact as any)?.id || conv.id;

    this.api.post('contacttags/add', { contactId, tag }).subscribe({
      next: () => {
        this.contactTags.update(prev => [...prev.filter(t => t !== tag), tag]);
        
        // Post System Notification in Chat
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

        this.showAlert('Tag Applied', `Tag "${tag}" saved to contact.`, 'success');
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || 'Failed to save tag', 'error');
      }
    });
  }

  handleRemoveTag(tag: string) {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;

    const contactId = conv.contactId || (conv.Contact as any)?.id || conv.id;

    this.api.post('contacttags/remove', { contactId, tag }).subscribe({
      next: () => {
        this.contactTags.update(prev => prev.filter(t => t !== tag));
        this.showAlert('Tag Removed', `Tag "${tag}" removed.`, 'success');
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || 'Failed to remove tag', 'error');
      }
    });
  }

  // --- Payment Request Modal Handlers ---
  openPayModal() {
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }
    this.isPayModalOpen.set(true);
  }

  handleSendPaymentRequest(req: PaymentRequestPayload) {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;

    this.api.post<any>('payments/create-order', {
      amount: req.amount,
      gateway: req.gateway,
      currency: req.currency
    }).subscribe({
      next: (orderRes: any) => {
        const orderId = orderRes.gatewayData?.orderId || orderRes.payment?.transactionId || orderRes.orderId;
        const paymentUrl = `${window.location.origin}/pay/${orderId}`;
        
        this.api.post<any>('messages/send-payment-link', {
          conversationId: conv.id,
          textContent: `Hi! Here is your payment request for ${req.description} (₹${req.amount}).`,
          paymentUrl: paymentUrl
        }).subscribe({
          next: (mRes: any) => {
            const newMsg = mRes.data || mRes;
            if (newMsg && newMsg.id) {
              const current = this.chatService.messagesSubject.value;
              this.chatService.messagesSubject.next([...current, newMsg]);
            }
            this.showAlert('Payment Link Sent', `Requested ₹${req.amount} successfully via ${req.gateway}.`, 'success');
          },
          error: (err: any) => {
            this.showAlert('Error', err.error?.error || 'Failed to send payment link', 'error');
          }
        });
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || 'Failed to generate order', 'error');
      }
    });
  }

  // --- Approved Template Modal Handlers ---
  openTemplateModal() {
    const conv = this.chatService.selectedConversation();
    if (!conv) {
      this.showAlert('No Conversation', 'Please select a conversation first.', 'warning');
      return;
    }
    this.isTemplateModalOpen.set(true);
  }

  handleSendTemplate(payload: TemplateDispatchPayload) {
    const conv = this.chatService.selectedConversation();
    if (!conv) return;

    this.api.post<any>('messages/send-template', {
      conversationId: conv.id,
      templateId: payload.templateId,
      customParameters: payload.customParameters
    }).subscribe({
      next: (res: any) => {
        this.isTemplateModalOpen.set(false);
        const newMsg = res.data || res;
        if (newMsg && newMsg.id) {
          const current = this.chatService.messagesSubject.value;
          this.chatService.messagesSubject.next([...current, newMsg]);
        }
        this.showAlert('Template Dispatched', `Meta Message Template "${payload.templateName}" sent successfully!`, 'success');
      },
      error: (err: any) => {
        this.showAlert('Delivery Failed', err.error?.error || err.message || 'Failed to dispatch template', 'error');
      }
    });
  }

  handleGalleryAssetSelected(assetUrl: string) {
    const conv = this.chatService.selectedConversation();
    if (!conv || !assetUrl) return;

    let mediaType = 'IMAGE';
    const lower = assetUrl.toLowerCase();

    if (lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.3gp')) {
      mediaType = 'VIDEO';
    } else if (lower.endsWith('.pdf') || lower.endsWith('.doc') || lower.endsWith('.docx') || lower.endsWith('.xlsx')) {
      mediaType = 'DOCUMENT';
    } else if (lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.ogg')) {
      mediaType = 'AUDIO';
    }

    const payload = {
      conversationId: conv.id,
      senderType: 'HUMAN',
      messageType: mediaType,
      content: assetUrl,
      mediaUrl: assetUrl,
      textContent: `[Media Attachment: ${mediaType}]`,
      direction: 'OUTBOUND'
    };

    this.api.post<any>('messages/add', payload).subscribe({
      next: (res: any) => {
        this.isAssetGalleryOpen.set(false);
        const newMsg = res.data || res;
        if (newMsg && newMsg.id) {
          const current = this.chatService.messagesSubject.value;
          this.chatService.messagesSubject.next([...current, newMsg]);
        }
        this.showAlert('Media Sent', `Media asset (${mediaType}) sent successfully from Gallery.`, 'success');
      },
      error: (err: any) => {
        this.showAlert('Error', err.error?.error || err.message || 'Failed to send media asset', 'error');
      }
    });
  }

  hasWindowClosedError(): boolean {
    const msgs = this.chatService.messagesSubject.value || [];
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg?.status === 'FAILED' && (
      (lastMsg.errorMessage && (lastMsg.errorMessage.includes('131047') || lastMsg.errorMessage.includes('window closed') || lastMsg.errorMessage.includes('Re-Engagement')))
    )) {
      return true;
    }
    return false;
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
