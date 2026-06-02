import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-fluxosdk-landing-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-header.component.html',
  styleUrl: './landing-header.component.scss',
})
export class FluxosdkLandingHeaderComponent {}
