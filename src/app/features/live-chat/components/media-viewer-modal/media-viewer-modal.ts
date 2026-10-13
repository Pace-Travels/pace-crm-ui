import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  ElementRef,
  ViewChild,
  HostListener,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ApiService } from '../../../../shared/services/api.service';
import Swal from 'sweetalert2';

export interface MediaViewerItem {
  id?: number | string;
  url?: string;
  mediaUrl?: string;
  content?: string;
  textContent?: string;
  caption?: string;
  messageType?: string;
  fileName?: string;
  direction?: string;
  senderType?: string;
  createdAt?: string | Date;
  isStarred?: boolean;
  reactionEmoji?: string;
  reactionSender?: string;
  whatsappMessageId?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-media-viewer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-viewer-modal.html',
  styleUrl: './media-viewer-modal.scss'
})
export class MediaViewerModal implements OnChanges {
  @Input() isOpen = false;
  @Input() initialMedia: MediaViewerItem | null = null;
  @Input() mediaList: MediaViewerItem[] = [];
  @Input() contact: any = null;

  @Output() close = new EventEmitter<void>();
  @Output() star = new EventEmitter<MediaViewerItem>();
  @Output() react = new EventEmitter<{ message: MediaViewerItem; emoji: string }>();
  @Output() reply = new EventEmitter<MediaViewerItem>();
  @Output() forward = new EventEmitter<MediaViewerItem>();
  @Output() download = new EventEmitter<MediaViewerItem>();
  @Output() viewInChat = new EventEmitter<MediaViewerItem>();

  @ViewChild('carouselStrip') carouselStrip?: ElementRef<HTMLDivElement>;
  @ViewChild('mediaImage') mediaImage?: ElementRef<HTMLImageElement>;

  api = inject(ApiService);
  sanitizer = inject(DomSanitizer);

  currentIndex = signal<number>(0);
  zoomLevel = signal<number>(1);
  rotationDeg = signal<number>(0);
  panOffset = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  isDragging = signal<boolean>(false);
  dragStart = { x: 0, y: 0 };

  showReactionPicker = signal<boolean>(false);
  showMoreMenu = signal<boolean>(false);
  quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  currentMedia = computed(() => {
    const list = this.mediaList;
    const idx = this.currentIndex();
    if (!list || list.length === 0) return null;
    return list[idx] || list[0] || null;
  });

  hasPrev = computed(() => this.currentIndex() > 0);
  hasNext = computed(() => this.currentIndex() < this.mediaList.length - 1);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.initCurrentMedia();
    } else if (changes['initialMedia'] && this.isOpen) {
      this.initCurrentMedia();
    }
  }

  private initCurrentMedia(): void {
    this.resetTransform();
    this.showReactionPicker.set(false);
    this.showMoreMenu.set(false);

    if (!this.mediaList || this.mediaList.length === 0) {
      if (this.initialMedia) {
        this.mediaList = [this.initialMedia];
      }
      this.currentIndex.set(0);
      return;
    }

    if (this.initialMedia) {
      const matchIdx = this.mediaList.findIndex(
        m => (m.id && this.initialMedia?.id && m.id === this.initialMedia.id) ||
             (this.getMediaRawUrl(m) === this.getMediaRawUrl(this.initialMedia))
      );
      if (matchIdx !== -1) {
        this.currentIndex.set(matchIdx);
      } else {
        // Prepend or add initialMedia to list
        this.mediaList = [this.initialMedia, ...this.mediaList];
        this.currentIndex.set(0);
      }
    } else {
      this.currentIndex.set(0);
    }

    setTimeout(() => this.scrollActiveThumbnailIntoView(), 150);
  }

  getMediaRawUrl(item: MediaViewerItem | null): string {
    if (!item) return '';
    return item.url || item.mediaUrl || item.content || '';
  }

  getMediaUrl(item: MediaViewerItem | null | string): string {
    const raw = typeof item === 'string' ? item : this.getMediaRawUrl(item);
    if (!raw || typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') || trimmed.includes('Attachment:')) return '';
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
      return trimmed;
    }
    const base = this.api.baseUrl.replace(/\/api\/v1\/?$/, '');
    return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }

  isVideo(item: MediaViewerItem | null): boolean {
    if (!item) return false;
    if (item.messageType === 'VIDEO') return true;
    const url = this.getMediaRawUrl(item).toLowerCase();
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.endsWith('.ogg');
  }

  getSenderDisplayName(): string {
    const item = this.currentMedia();
    if (!item) return this.contact?.name || 'Contact';
    if (item.direction === 'OUTBOUND' || item.senderType === 'HUMAN' || item.senderType === 'USER') {
      return 'You';
    }
    return this.contact?.name || (this.contact?.firstName ? `${this.contact.firstName} ${this.contact?.lastName || ''}`.trim() : 'Contact');
  }

  getFormattedTimestamp(): string {
    const item = this.currentMedia();
    if (!item || !item.createdAt) return '';
    try {
      const d = new Date(item.createdAt);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const yesterday = new Date();
      yesterday.setDate(now.getDate() - 1);
      const isYesterday = d.toDateString() === yesterday.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

      if (isToday) {
        return `Today at ${timeStr}`;
      } else if (isYesterday) {
        return `Yesterday at ${timeStr}`;
      } else {
        const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
        return `${dateStr} at ${timeStr}`;
      }
    } catch {
      return '';
    }
  }

  formatCaption(text?: string): SafeHtml {
    if (!text) return this.sanitizer.bypassSecurityTrustHtml('');
    let formatted = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // WhatsApp formatting
    formatted = formatted.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    formatted = formatted.replace(/~([^~]+)~/g, '<del>$1</del>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.15); padding: 1px 4px; border-radius: 3px;">$1</code>');
    formatted = formatted.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color: #53bdeb; text-decoration: underline;">$1</a>');
    formatted = formatted.replace(/\n/g, '<br>');

    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }

  getCaptionText(): string {
    const item = this.currentMedia();
    if (!item) return '';
    const cap = item.caption || item.textContent;
    if (cap && !cap.startsWith('[') && !cap.includes('Attachment:')) {
      return cap;
    }
    // If content is not a URL, use content as caption
    if (item.content && !item.content.startsWith('http') && !item.content.startsWith('/') && !item.content.startsWith('[')) {
      return item.content;
    }
    return '';
  }

  // Navigation
  prevMedia(): void {
    if (this.hasPrev()) {
      this.currentIndex.update(i => i - 1);
      this.resetTransform();
      this.scrollActiveThumbnailIntoView();
    }
  }

  nextMedia(): void {
    if (this.hasNext()) {
      this.currentIndex.update(i => i + 1);
      this.resetTransform();
      this.scrollActiveThumbnailIntoView();
    }
  }

  selectMedia(index: number): void {
    if (index >= 0 && index < this.mediaList.length) {
      this.currentIndex.set(index);
      this.resetTransform();
      this.scrollActiveThumbnailIntoView();
    }
  }

  scrollActiveThumbnailIntoView(): void {
    if (!this.carouselStrip) return;
    const activeEl = this.carouselStrip.nativeElement.querySelector('.carousel-thumb.active') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  // Zoom and Pan Controls
  zoomIn(): void {
    this.zoomLevel.update(z => Math.min(+(z + 0.25).toFixed(2), 4.0));
  }

  zoomOut(): void {
    this.zoomLevel.update(z => {
      const next = Math.max(+(z - 0.25).toFixed(2), 0.5);
      if (next <= 1) {
        this.panOffset.set({ x: 0, y: 0 });
      }
      return next;
    });
  }

  resetTransform(): void {
    this.zoomLevel.set(1);
    this.rotationDeg.set(0);
    this.panOffset.set({ x: 0, y: 0 });
    this.isDragging.set(false);
  }

  toggleZoom(): void {
    if (this.zoomLevel() > 1) {
      this.resetTransform();
    } else {
      this.zoomLevel.set(2.0);
    }
  }

  rotateRight(): void {
    this.rotationDeg.update(r => (r + 90) % 360);
  }

  onMouseDown(e: MouseEvent): void {
    if (this.zoomLevel() <= 1) return;
    e.preventDefault();
    this.isDragging.set(true);
    this.dragStart = {
      x: e.clientX - this.panOffset().x,
      y: e.clientY - this.panOffset().y
    };
  }

  onMouseMove(e: MouseEvent): void {
    if (!this.isDragging()) return;
    e.preventDefault();
    this.panOffset.set({
      x: e.clientX - this.dragStart.x,
      y: e.clientY - this.dragStart.y
    });
  }

  onMouseUp(): void {
    this.isDragging.set(false);
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  // Actions
  toggleReactionPicker(e: MouseEvent): void {
    e.stopPropagation();
    this.showReactionPicker.set(!this.showReactionPicker());
    this.showMoreMenu.set(false);
  }

  selectReaction(emoji: string, e: MouseEvent): void {
    e.stopPropagation();
    const item = this.currentMedia();
    if (item) {
      item.reactionEmoji = emoji;
      this.react.emit({ message: item, emoji });
    }
    this.showReactionPicker.set(false);
  }

  toggleStar(): void {
    const item = this.currentMedia();
    if (item) {
      item.isStarred = !item.isStarred;
      this.star.emit(item);
    }
  }

  onReply(): void {
    const item = this.currentMedia();
    if (item) {
      this.reply.emit(item);
      this.onClose();
    }
  }

  onForward(): void {
    const item = this.currentMedia();
    if (item) {
      this.forward.emit(item);
    }
  }

  onDownload(): void {
    const item = this.currentMedia();
    if (!item) return;
    const url = this.getMediaUrl(item);
    if (!url) return;

    this.download.emit(item);

    // Direct browser trigger
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.download = item.fileName || `whatsapp-media-${item.id || Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  toggleMoreMenu(e: MouseEvent): void {
    e.stopPropagation();
    this.showMoreMenu.set(!this.showMoreMenu());
    this.showReactionPicker.set(false);
  }

  searchOnWeb(): void {
    this.showMoreMenu.set(false);
    const item = this.currentMedia();
    if (!item) return;
    const url = this.getMediaUrl(item);
    if (!url) return;
    const lensUrl = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(url)}`;
    window.open(lensUrl, '_blank');
  }

  copyLink(): void {
    this.showMoreMenu.set(false);
    const item = this.currentMedia();
    if (!item) return;
    const url = this.getMediaUrl(item);
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Media link copied to clipboard!',
        showConfirmButton: false,
        timer: 2000,
        background: '#111b21',
        color: '#e9edef'
      });
    });
  }

  onViewInChat(): void {
    this.showMoreMenu.set(false);
    const item = this.currentMedia();
    if (item) {
      this.viewInChat.emit(item);
      this.onClose();
    }
  }

  onClose(): void {
    this.resetTransform();
    this.showReactionPicker.set(false);
    this.showMoreMenu.set(false);
    this.close.emit();
  }

  // Keyboard Shortcuts
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isOpen) return;

    switch (event.key) {
      case 'Escape':
        this.onClose();
        break;
      case 'ArrowLeft':
        this.prevMedia();
        break;
      case 'ArrowRight':
        this.nextMedia();
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
      case '_':
        this.zoomOut();
        break;
      case '0':
        this.resetTransform();
        break;
      case 'r':
      case 'R':
        this.rotateRight();
        break;
    }
  }
}
