import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FlowService, Flow } from '../../services/flow.service';

declare var Swal: any;

@Component({
  selector: 'app-flow-builder-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './flow-builder-view.html',
  styleUrl: './flow-builder-view.scss',
})
export class FlowBuilderView implements OnInit {
  flowService = inject(FlowService);
  router = inject(Router);

  activeTab = 'Your Flows';

  selectedBlueprintScript = signal<string | null>(null);
  selectedBlueprintTitle = signal<string>('');

  blueprints = signal<any[]>([
    {
      id: 'pace_b2c_concierge',
      name: '✈️ Pace Travels B2C Concierge Bot',
      description: '24/7 AI Concierge answering flight inquiries, hotel availability & custom holiday packages.',
      triggerKeywords: 'HI, BOOK, PACKAGE, FLIGHT',
      model: 'Gemini 1.5 Flash',
      humanHandoffTrigger: 'Keywords: "agent", "speak to human", "custom quote", "operator"',
      embedScript: `<script src="https://messengerapi.quotedesks.com/sdk/pace-widget.js" data-widget-key="pace_b2c_concierge_widget" data-handover="ENABLED"></script>`
    },
    {
      id: 'dubai_pace_vip',
      name: '🕌 Dubai Pace VIP Safari & Yacht Bot',
      description: 'Specialist AI bot booking Red Dune Safaris, Burj Khalifa VIP passes & Atlantis yacht cruises.',
      triggerKeywords: 'DUBAI, SAFARI, YACHT, BURJ',
      model: 'Gemini 1.5 Pro',
      humanHandoffTrigger: 'Keywords: "vip agent", "custom yacht", "speak to human"',
      embedScript: `<script src="https://messengerapi.quotedesks.com/sdk/pace-widget.js" data-widget-key="dubai_pace_vip_widget" data-handover="ENABLED"></script>`
    },
    {
      id: 'thai_pace_b2b',
      name: '🏝️ Thai Pace Tourism B2B Wholesale Bot',
      description: 'B2B agent qualification, wholesale land package tariffs & B2B voucher generator.',
      triggerKeywords: 'B2B, WHOLESALE, THAI, PHUKET',
      model: 'Gemini 1.5 Pro',
      humanHandoffTrigger: 'Keywords: "agency registration", "human agent", "contract"',
      embedScript: `<script src="https://messengerapi.quotedesks.com/sdk/pace-widget.js" data-widget-key="thai_pace_b2b_widget" data-handover="ENABLED"></script>`
    },
    {
      id: 'vietnam_pace_land',
      name: '⛩️ Pace Tourism Vietnam Land Specialist',
      description: 'AI land package bot calculating Hanoi, Halong Bay luxury cruises & Da Nang itineraries.',
      triggerKeywords: 'VIETNAM, HALONG, HANOI, CRUISE',
      model: 'Gemini 1.5 Flash',
      humanHandoffTrigger: 'Keywords: "human", "land tariff", "group booking"',
      embedScript: `<script src="https://messengerapi.quotedesks.com/sdk/pace-widget.js" data-widget-key="vietnam_pace_land_widget" data-handover="ENABLED"></script>`
    }
  ]);

  ngOnInit() {
    this.flowService.fetchFlows();
  }

  onToggleStatus(flow: Flow) {
    if (!flow.id) return;
    this.flowService.toggleFlow(flow.id).subscribe({
      next: () => this.flowService.fetchFlows()
    });
  }

  editFlow(flow: Flow) {
    if (flow.id) {
      this.router.navigate(['/flows/canvas', flow.id]);
    } else {
      this.router.navigate(['/flows/canvas']);
    }
  }

  deployBlueprint(bp: any) {
    this.showAlert('Deploying Agentic AI Bot', `Deploying ${bp.name} blueprint to live WABA session with Human Transfer enabled...`, 'success');
    setTimeout(() => {
      this.router.navigate(['/flows/canvas']);
    }, 1200);
  }

  showEmbedCode(bp: any) {
    this.selectedBlueprintTitle.set(bp.name);
    this.selectedBlueprintScript.set(bp.embedScript);
  }

  closeScriptModal() {
    this.selectedBlueprintScript.set(null);
  }

  private showAlert(title: string, text: string, icon: string) {
    Swal.fire({ title, text, icon: icon as any, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
  }
}
