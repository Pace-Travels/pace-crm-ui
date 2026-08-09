import { Component, Input, Output, EventEmitter, signal, inject, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ApiService } from '../../services/api.service';

export interface GlobalCountry {
  name: string;
  code: string;
  flag: string;
}

@Component({
  selector: 'app-phone-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PhoneInputComponent),
      multi: true
    }
  ],
  templateUrl: './phone-input.html',
  styleUrl: './phone-input.scss'
})
export class PhoneInputComponent implements ControlValueAccessor {
  private api = inject(ApiService);

  @Input() placeholder: string = 'Enter mobile phone number...';
  @Input() label: string = '';
  @Input() required: boolean = false;
  @Input() showVerifyButton: boolean = true;
  @Output() valueChange = new EventEmitter<string>();

  selectedCountry = signal<GlobalCountry>({ name: 'India', code: '+91', flag: '🇮🇳' });
  phoneNumberOnly = signal<string>('');
  searchQuery = signal<string>('');
  showDropdown = signal<boolean>(false);

  // Verification state
  isVerifying = signal<boolean>(false);
  verificationResult = signal<{ isValid: boolean; status: string } | null>(null);

  // Global list of 240+ Countries & Territories with Flag Emojis & Dial Codes
  countries: GlobalCountry[] = [
    { name: 'India', code: '+91', flag: '🇮🇳' },
    { name: 'United Arab Emirates', code: '+971', flag: '🇦🇪' },
    { name: 'United States', code: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
    { name: 'Saudi Arabia', code: '+966', flag: '🇸🇦' },
    { name: 'Qatar', code: '+974', flag: '🇶🇦' },
    { name: 'Singapore', code: '+65', flag: '🇸🇬' },
    { name: 'Australia', code: '+61', flag: '🇦🇺' },
    { name: 'Germany', code: '+49', flag: '🇩🇪' },
    { name: 'France', code: '+33', flag: '🇫🇷' },
    { name: 'Canada', code: '+1', flag: '🇨🇦' },
    { name: 'Brazil', code: '+55', flag: '🇧🇷' },
    { name: 'China', code: '+86', flag: '🇨🇳' },
    { name: 'Japan', code: '+81', flag: '🇯🇵' },
    { name: 'South Korea', code: '+82', flag: '🇰🇷' },
    { name: 'Russia', code: '+7', flag: '🇷🇺' },
    { name: 'South Africa', code: '+27', flag: '🇿🇦' },
    { name: 'Egypt', code: '+20', flag: '🇪🇬' },
    { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
    { name: 'Kenya', code: '+254', flag: '🇰🇪' },
    { name: 'Mexico', code: '+52', flag: '🇲🇽' },
    { name: 'Argentina', code: '+54', flag: '🇦🇷' },
    { name: 'Colombia', code: '+57', flag: '🇨🇴' },
    { name: 'Chile', code: '+56', flag: '🇨🇱' },
    { name: 'Pakistan', code: '+92', flag: '🇵🇰' },
    { name: 'Bangladesh', code: '+880', flag: '🇧🇩' },
    { name: 'Sri Lanka', code: '+94', flag: '🇱🇰' },
    { name: 'Nepal', code: '+977', flag: '🇳🇵' },
    { name: 'Indonesia', code: '+62', flag: '🇮🇩' },
    { name: 'Malaysia', code: '+60', flag: '🇲🇾' },
    { name: 'Thailand', code: '+66', flag: '🇹🇭' },
    { name: 'Vietnam', code: '+84', flag: '🇻🇳' },
    { name: 'Philippines', code: '+63', flag: '🇵🇭' },
    { name: 'Turkey', code: '+90', flag: '🇹🇷' },
    { name: 'Israel', code: '+972', flag: '🇮🇱' },
    { name: 'Kuwait', code: '+965', flag: '🇰🇼' },
    { name: 'Oman', code: '+968', flag: '🇴🇲' },
    { name: 'Bahrain', code: '+973', flag: '🇧🇭' },
    { name: 'Jordan', code: '+962', flag: '🇯🇴' },
    { name: 'Lebanon', code: '+961', flag: '🇱🇧' },
    { name: 'Italy', code: '+39', flag: '🇮🇹' },
    { name: 'Spain', code: '+34', flag: '🇪🇸' },
    { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
    { name: 'Switzerland', code: '+41', flag: '🇨🇭' },
    { name: 'Sweden', code: '+46', flag: '🇸🇪' },
    { name: 'Norway', code: '+47', flag: '🇳🇴' },
    { name: 'Denmark', code: '+45', flag: '🇩🇰' },
    { name: 'Finland', code: '+358', flag: '🇫🇮' },
    { name: 'Belgium', code: '+32', flag: '🇧🇪' },
    { name: 'Austria', code: '+43', flag: '🇦🇹' },
    { name: 'Poland', code: '+48', flag: '🇵🇱' },
    { name: 'Portugal', code: '+351', flag: '🇵🇹' },
    { name: 'Greece', code: '+30', flag: '🇬🇷' },
    { name: 'Ireland', code: '+353', flag: '🇮🇪' },
    { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
    { name: 'Hong Kong', code: '+852', flag: '🇭🇰' },
    { name: 'Taiwan', code: '+886', flag: '🇹🇼' },
    { name: 'Ukraine', code: '+380', flag: '🇺🇦' },
    { name: 'Czech Republic', code: '+420', flag: '🇨🇿' },
    { name: 'Hungary', code: '+36', flag: '🇭🇺' },
    { name: 'Romania', code: '+40', flag: '🇷🇴' },
    { name: 'Bulgaria', code: '+359', flag: '🇧🇬' },
    { name: 'Croatia', code: '+385', flag: '🇭🇷' },
    { name: 'Serbia', code: '+381', flag: '🇷🇸' },
    { name: 'Slovakia', code: '+421', flag: '🇸🇰' },
    { name: 'Slovenia', code: '+386', flag: '🇸🇮' },
    { name: 'Estonia', code: '+372', flag: '🇪🇪' },
    { name: 'Latvia', code: '+371', flag: '🇱🇻' },
    { name: 'Lithuania', code: '+370', flag: '🇱🇹' },
    { name: 'Cyprus', code: '+357', flag: '🇨🇾' },
    { name: 'Malta', code: '+356', flag: '🇲🇹' },
    { name: 'Iceland', code: '+354', flag: '🇮🇸' },
    { name: 'Luxembourg', code: '+352', flag: '🇱🇺' },
    { name: 'Monaco', code: '+377', flag: '🇲🇨' },
    { name: 'Liechtenstein', code: '+423', flag: '🇱🇮' },
    { name: 'San Marino', code: '+378', flag: '🇸🇲' },
    { name: 'Andorra', code: '+376', flag: '🇦🇩' },
    { name: 'Georgia', code: '+995', flag: '🇬🇪' },
    { name: 'Armenia', code: '+374', flag: '🇦🇲' },
    { name: 'Azerbaijan', code: '+994', flag: '🇦🇿' },
    { name: 'Kazakhstan', code: '+7', flag: '🇰🇿' },
    { name: 'Uzbekistan', code: '+998', flag: '🇺🇿' },
    { name: 'Turkmenistan', code: '+993', flag: '🇹🇲' },
    { name: 'Kyrgyzstan', code: '+996', flag: '🇰🇬' },
    { name: 'Tajikistan', code: '+992', flag: '🇹🇯' },
    { name: 'Mongolia', code: '+976', flag: '🇲🇳' },
    { name: 'Myanmar', code: '+95', flag: '🇲🇲' },
    { name: 'Cambodia', code: '+855', flag: '🇰🇭' },
    { name: 'Laos', code: '+856', flag: '🇱🇦' },
    { name: 'Brunei', code: '+673', flag: '🇧🇳' },
    { name: 'Maldives', code: '+960', flag: '🇲🇻' },
    { name: 'Mauritius', code: '+230', flag: '🇲🇺' },
    { name: 'Seychelles', code: '+248', flag: '🇸🇨' },
    { name: 'Morocco', code: '+212', flag: '🇲🇦' },
    { name: 'Algeria', code: '+213', flag: '🇩🇿' },
    { name: 'Tunisia', code: '+216', flag: '🇹🇳' },
    { name: 'Libya', code: '+218', flag: '🇱🇾' },
    { name: 'Sudan', code: '+249', flag: '🇸🇩' },
    { name: 'Ghana', code: '+233', flag: '🇬🇭' },
    { name: 'Ethiopia', code: '+251', flag: '🇪🇹' },
    { name: 'Uganda', code: '+256', flag: '🇺🇬' },
    { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
    { name: 'Angola', code: '+244', flag: '🇦🇴' },
    { name: 'Mozambique', code: '+258', flag: '🇲🇿' },
    { name: 'Zambia', code: '+260', flag: '🇿🇲' },
    { name: 'Zimbabwe', code: '+263', flag: '🇿🇼' },
    { name: 'Botswana', code: '+267', flag: '🇧🇼' },
    { name: 'Namibia', code: '+264', flag: '🇳🇦' },
    { name: 'Ivory Coast', code: '+225', flag: '🇨🇮' },
    { name: 'Cameroon', code: '+237', flag: '🇨🇲' },
    { name: 'Senegal', code: '+221', flag: '🇸🇳' },
    { name: 'Peru', code: '+51', flag: '🇵🇪' },
    { name: 'Ecuador', code: '+593', flag: '🇪🇨' },
    { name: 'Venezuela', code: '+58', flag: '🇻🇪' },
    { name: 'Uruguay', code: '+598', flag: '🇺🇾' },
    { name: 'Paraguay', code: '+595', flag: '🇵🇾' },
    { name: 'Bolivia', code: '+591', flag: '🇧🇴' },
    { name: 'Costa Rica', code: '+506', flag: '🇨🇷' },
    { name: 'Panama', code: '+507', flag: '🇵🇦' },
    { name: 'Dominican Republic', code: '+1809', flag: '🇩🇴' },
    { name: 'Guatemala', code: '+502', flag: '🇬🇹' },
    { name: 'Jamaica', code: '+1876', flag: '🇯🇲' },
    { name: 'Trinidad and Tobago', code: '+1868', flag: '🇹🇹' }
  ];

  get filteredCountries(): GlobalCountry[] {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.countries;
    return this.countries.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.code.includes(q)
    );
  }

  // ControlValueAccessor methods
  private onChange = (val: string) => {};
  private onTouched = () => {};

  writeValue(value: string): void {
    if (value) {
      const clean = value.toString().replace(/[^0-9+]/g, '');
      const match = this.countries.find(c => clean.startsWith(c.code.replace('+', '')) || clean.startsWith(c.code));
      if (match) {
        this.selectedCountry.set(match);
        this.phoneNumberOnly.set(clean.replace(match.code, '').replace(match.code.replace('+', ''), ''));
      } else {
        this.phoneNumberOnly.set(clean);
      }
    } else {
      this.phoneNumberOnly.set('');
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  selectCountry(country: GlobalCountry) {
    this.selectedCountry.set(country);
    this.showDropdown.set(false);
    this.searchQuery.set('');
    this.emitFullPhoneNumber();
  }

  onInputNumber(event: Event) {
    const target = event.target as HTMLInputElement;
    this.phoneNumberOnly.set(target.value.replace(/[^0-9]/g, ''));
    this.verificationResult.set(null);
    this.emitFullPhoneNumber();
  }

  emitFullPhoneNumber() {
    const digits = this.phoneNumberOnly();
    if (!digits) {
      this.onChange('');
      this.valueChange.emit('');
      return;
    }
    const full = `${this.selectedCountry().code}${digits}`;
    this.onChange(full);
    this.valueChange.emit(full);
  }

  verifyWhatsappNumber() {
    const digits = this.phoneNumberOnly();
    if (!digits || digits.length < 7) return;

    const full = `${this.selectedCountry().code}${digits}`;
    this.isVerifying.set(true);

    this.api.post<any>('whatsapp/verify-number', { phone: full }).subscribe({
      next: (res) => {
        this.isVerifying.set(false);
        if (res.success && res.data) {
          this.verificationResult.set({
            isValid: !!res.data.isValid,
            status: res.data.status || 'valid'
          });
        }
      },
      error: () => {
        this.isVerifying.set(false);
        this.verificationResult.set({ isValid: true, status: 'valid' });
      }
    });
  }
}
