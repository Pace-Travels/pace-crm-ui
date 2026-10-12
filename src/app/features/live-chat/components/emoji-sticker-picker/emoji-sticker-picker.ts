import { Component, EventEmitter, Output, Input, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface StickerItem {
  id: string;
  url: string;
  title: string;
  packId: string;
}

export interface StickerPack {
  id: string;
  name: string;
  icon: string;
  stickers: StickerItem[];
}

@Component({
  selector: 'app-emoji-sticker-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './emoji-sticker-picker.html',
  styleUrl: './emoji-sticker-picker.scss'
})
export class EmojiStickerPicker {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() selectEmoji = new EventEmitter<string>();
  @Output() selectSticker = new EventEmitter<string>();

  activeTab = signal<'EMOJI' | 'GIF' | 'STICKER'>('EMOJI');
  activeEmojiCategory = signal<string>('smileys');
  searchQuery = signal<string>('');

  // Curated 24+ working Giphy direct CDN GIF list
  sampleGifs = [
    { id: '1', title: 'Thumbs Up', url: 'https://i.giphy.com/3o7abKhOpu0NwenH3O.gif' },
    { id: '2', title: 'Celebration', url: 'https://i.giphy.com/l2JIdnF6aJnAqzDgY.gif' },
    { id: '3', title: 'Thank You', url: 'https://i.giphy.com/l3q2u6MXJ28MORy1y.gif' },
    { id: '4', title: 'Welcome', url: 'https://i.giphy.com/dZA8p3R2uWdG0.gif' },
    { id: '5', title: 'Deal Closed', url: 'https://i.giphy.com/l0KnN6LqXoZlJ0b4s.gif' },
    { id: '6', title: 'Flight Takeoff', url: 'https://i.giphy.com/l0HlHFRbmaZtBRhXG.gif' },
    { id: '7', title: 'Happy Dance', url: 'https://i.giphy.com/111ebonMs92l7W.gif' },
    { id: '8', title: 'Applause & Clapping', url: 'https://i.giphy.com/26tknCqiYweyuLu2A.gif' },
    { id: '9', title: 'Big Win Success', url: 'https://i.giphy.com/xT0xezQGU5xCDJuCPe.gif' },
    { id: '10', title: 'Plane Window View', url: 'https://i.giphy.com/3o6Zt8qDiPE2nq3kay.gif' },
    { id: '11', title: 'Mind Blown', url: 'https://i.giphy.com/3o7TKsjLu903G5wS2Y.gif' },
    { id: '12', title: 'High Five', url: 'https://i.giphy.com/3o7qDSOv7X94veU2T6.gif' },
    { id: '13', title: 'Coffee Time', url: 'https://i.giphy.com/26u4b45b8KxyCitkY.gif' },
    { id: '14', title: 'Yes Agreed', url: 'https://i.giphy.com/l3vR85PnL61f6xFLG.gif' },
    { id: '15', title: 'Money Rain', url: 'https://i.giphy.com/3o6gDWzmAzrpi5DQU8.gif' },
    { id: '16', title: 'Love Heart', url: 'https://i.giphy.com/26fldmqs2tIEtPcmY.gif' },
    { id: '17', title: 'Good Morning', url: 'https://i.giphy.com/3o7TKMt1VVNkHV2PaE.gif' },
    { id: '18', title: 'Special Offer Discount', url: 'https://i.giphy.com/l0HlvcRywy1WXmvMG.gif' },
    { id: '19', title: 'Customer Support', url: 'https://i.giphy.com/3o7bu3XilJ5BOiSGic.gif' },
    { id: '20', title: 'Let\'s Go Excited', url: 'https://i.giphy.com/3o7TKVfdt7s4qO4fS0.gif' },
    { id: '21', title: 'Tropical Vacation', url: 'https://i.giphy.com/3oKIPnAiaMCws8nOsE.gif' },
    { id: '22', title: 'Passport Ready', url: 'https://i.giphy.com/l2JdZOPZ3kLp4b4ze.gif' },
    { id: '23', title: 'Fireworks Party', url: 'https://i.giphy.com/3o7TKwnM2w4c2Cflte.gif' },
    { id: '24', title: 'Great Job OK', url: 'https://i.giphy.com/l0HlQXkh1wx1RRTXi.gif' }
  ];

  // Built-in Sticker Packs System (Extendable)
  stickerPacks: StickerPack[] = [
    {
      id: 'travel-deals',
      name: 'Travel & Packages',
      icon: '✈️',
      stickers: [
        { id: 's1', packId: 'travel-deals', title: 'Airplane', url: 'https://cdn-icons-png.flaticon.com/512/201/201623.png' },
        { id: 's2', packId: 'travel-deals', title: 'Beach Resort', url: 'https://cdn-icons-png.flaticon.com/512/2664/2664593.png' },
        { id: 's3', packId: 'travel-deals', title: 'Passport Approved', url: 'https://cdn-icons-png.flaticon.com/512/2991/2991108.png' },
        { id: 's4', packId: 'travel-deals', title: 'Luggage Packed', url: 'https://cdn-icons-png.flaticon.com/512/3127/3127420.png' }
      ]
    },
    {
      id: 'customer-care',
      name: 'Support & Greetings',
      icon: '💬',
      stickers: [
        { id: 's5', packId: 'customer-care', title: 'Happy Agent', url: 'https://cdn-icons-png.flaticon.com/512/4140/4140048.png' },
        { id: 's6', packId: 'customer-care', title: '24/7 Verified', url: 'https://cdn-icons-png.flaticon.com/512/1067/1067566.png' },
        { id: 's7', packId: 'customer-care', title: 'Deal Discount', url: 'https://cdn-icons-png.flaticon.com/512/726/726476.png' },
        { id: 's8', packId: 'customer-care', title: 'Thank You', url: 'https://cdn-icons-png.flaticon.com/512/1000/1000946.png' }
      ]
    }
  ];

  selectedStickerPackId = signal<string>('travel-deals');

  // Categorized Emojis Matrix
  emojiCategories = [
    { id: 'recent', icon: 'fa-regular fa-clock', title: 'Recent', emojis: ['😭', '🥺', '😂', '🔥', '👍', '❤️', '🙏', '✨'] },
    { id: 'smileys', icon: 'fa-regular fa-face-smile', title: 'Smileys & People', emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓',
      '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫'
    ]},
    { id: 'animals', icon: 'fa-solid fa-dog', title: 'Animals & Nature', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🐙', '🦑', 'shrimp', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🦙', '🦥', '🦨', '🦡', '🦦'] },
    { id: 'food', icon: 'fa-solid fa-utensils', title: 'Food & Drink', emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '🧊', '🥄', '🍴', '🍽️', '🥣', '🥡', '🥢'] },
    { id: 'activity', icon: 'fa-solid fa-basketball', title: 'Activity', emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎷', '🎸', '🎹', '🎺', '🎻', '🪕', '🥁', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩'] },
    { id: 'travel', icon: 'fa-solid fa-plane', title: 'Travel & Places', emojis: ['🚗', '🚕', '🚙', '🚌', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏎️', '🏍️', '🛵', '🛺', '🚲', '🛴', '🛹', '🚨', '🚔', '🚍', '🚘', '🚖', '🛞', '🦽', '🦼', '⚓', '⛵', '🛶', '🚤', '🛳️', '⚙️', '🛥️', '🚢', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚁', '🚟', '缆', '🚡', '🛰️', '🚀', '🛸', '🛎️', '🧳', '⌛', '⏳', '⌚', '⏰', '⏱️', '⏲️', '🕰️', '🌡️', '☀️', '🌝', '🌞', '🪐', '⭐', '🌟', '🌠', '🌌', '☁️', '⛅', '⛈️', '🌤️', '🌥️', '🌦️', '🌧️', '🌩️', '⚡', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌈', '☂️', '☔', '🔥', '💧', '🌊'] }
  ];

  filteredEmojis = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return [];
    const all: string[] = [];
    for (const cat of this.emojiCategories) {
      all.push(...cat.emojis);
    }
    return Array.from(new Set(all)).filter(e => e.includes(q));
  });

  filteredGifs = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.sampleGifs;
    return this.sampleGifs.filter(g => g.title.toLowerCase().includes(q));
  });

  currentStickers = computed(() => {
    const pack = this.stickerPacks.find(p => p.id === this.selectedStickerPackId());
    return pack ? pack.stickers : [];
  });

  onEmojiClick(emoji: string) {
    this.selectEmoji.emit(emoji);
  }

  onGifClick(gifUrl: string) {
    this.selectSticker.emit(gifUrl);
    this.close.emit();
  }

  onStickerClick(stickerUrl: string) {
    this.selectSticker.emit(stickerUrl);
    this.close.emit();
  }

  setCategory(catId: string) {
    this.activeEmojiCategory.set(catId);
    const elem = document.getElementById(`cat-${catId}`);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  closePopover() {
    this.close.emit();
  }
}
