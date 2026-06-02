import { Component } from '@angular/core';
import { FluxosdkLandingCtaComponent } from './components/landing-cta/landing-cta.component';
import { FluxosdkLandingFaqComponent } from './components/landing-faq/landing-faq.component';
import { FluxosdkLandingFeaturesComponent } from './components/landing-features/landing-features.component';
import { FluxosdkLandingFooterComponent } from './components/landing-footer/landing-footer.component';
import { FluxosdkLandingHeaderComponent } from './components/landing-header/landing-header.component';
import { FluxosdkLandingHeroComponent } from './components/landing-hero/landing-hero.component';
import { FluxosdkLandingPricingComponent } from './components/landing-pricing/landing-pricing.component';
import { FluxosdkLandingProblemComponent } from './components/landing-problem/landing-problem.component';
import { FluxosdkLandingTrustComponent } from './components/landing-trust/landing-trust.component';
import { FluxosdkLandingWorkflowComponent } from './components/landing-workflow/landing-workflow.component';

@Component({
  selector: 'app-fluxosdk-landing',
  standalone: true,
  imports: [
    FluxosdkLandingHeaderComponent,
    FluxosdkLandingHeroComponent,
    FluxosdkLandingTrustComponent,
    FluxosdkLandingProblemComponent,
    FluxosdkLandingFeaturesComponent,
    FluxosdkLandingWorkflowComponent,
    FluxosdkLandingPricingComponent,
    FluxosdkLandingFaqComponent,
    FluxosdkLandingCtaComponent,
    FluxosdkLandingFooterComponent,
  ],
  templateUrl: './fluxosdk-landing.component.html',
  styleUrl: './fluxosdk-landing.component.scss',
})
export class FluxosdkLandingComponent {}
