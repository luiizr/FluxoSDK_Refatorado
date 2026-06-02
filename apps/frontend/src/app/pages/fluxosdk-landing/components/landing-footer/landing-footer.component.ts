import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-fluxosdk-landing-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-footer.component.html',
  styleUrl: './landing-footer.component.scss',
})
export class FluxosdkLandingFooterComponent {
  readonly year = new Date().getFullYear();
}
