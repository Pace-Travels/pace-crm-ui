import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-templates-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './templates-view.html',
  styleUrl: './templates-view.scss',
})
export class TemplatesView {
  activeTab = 'Explore';
  activeCategory = 'Trending';

  templates = [
    { title: 'Holi Abandoned Cart', type: 'TEXT', text: 'Hi [Shivam], Your cart is still waiting \uD83D\uDC40 With Holi around the corner, stocks are moving fast. Complete your order now and use code HOLI20 to get 20% OFF + Free Shipping \uD83C\uDF89', img: 'https://cdn-icons-png.flaticon.com/512/3081/3081986.png' },
    { title: 'Holi Wishes & Offer', type: 'IMAGE', text: '\uD83C\uDF08 \u2728 *Holi Special. Exclusive Discounts Just for You [Shivam]* Enjoy *[25%]* OFF* on [Bassheads 225] & celebrate this festival with BIG savings! But don\'t wait too long: offer ends in [24 hours]! \uD83D\uDE80', img: 'https://cdn-icons-png.flaticon.com/512/2984/2984920.png' },
    { title: 'Holi Wishes + Offer', type: 'IMAGE', text: '\uD83C\uDF89 Hey [Shivam], Holi is here & so are the best festive deals! \uD83C\uDF89 Enjoy *[20%]* OFF* on [Bassheads 225]—because celebrations are better with savings! \uD83D\uDD25', img: 'https://cdn-icons-png.flaticon.com/512/3212/3212678.png' },
    { title: 'First Message', type: 'IMAGE', text: 'The firsts are always special, like your first salary, your first car & your first date\uD83D\uDE0D. Do you know what\'s special for us? *YOUR FIRST ORDER \uD83D\uDE0D* We want to make it special for you too - Get a FLAT DISCOUNT of [50%] o...', img: 'https://cdn-icons-png.flaticon.com/512/3063/3063822.png' },
    { title: 'Offer Message', type: 'IMAGE', text: '*Final Hours to Go ! Offer Ends Soon* \uD83D\uDC4D [20%]* Discount on Any purchase | It\'s Time to Action \uD83C\uDF88 Use Discount Code \uD83D\uDC49 [20OFF] & Get *[20%] Discount* Expires Tonight \u2757\u2757 \uD83D\uDC49 [FREE Delivery] \uD83D\uDC49 [Zero EMI] ...', img: 'https://cdn-icons-png.flaticon.com/512/2950/2950664.png' },
    { title: 'Event Invite', type: 'IMAGE', text: 'Dear [Ayush], [Pace Messenger] is back with another [WhatsApp Marketing] event for you: Event Details: Date - [3rd December] Time - [3 PM - 6 PM] Location - [Meta Headquarters, Gurugram] Hurry, click the below butto...', img: 'https://cdn-icons-png.flaticon.com/512/2950/2950650.png' }
  ];
}
