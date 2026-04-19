import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router'; // Added RouterModule
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule], // Added RouterModule here
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss', // We will extract SCSS soon
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected isRegistering = signal<boolean>(false);
  protected isAuthLoading = signal<boolean>(false);
  protected authEmail = signal<string>('');
  protected authPassword = signal<string>('');

  async authenticate(event: Event) {
    event.preventDefault();
    if (!this.authEmail() || !this.authPassword()) return;

    this.isAuthLoading.set(true);
    try {
      let user;
      if (this.isRegistering()) {
        user = await this.authService.register(
          this.authEmail(),
          this.authPassword(),
        );
      } else {
        user = await this.authService.login(
          this.authEmail(),
          this.authPassword(),
        );
      }

      localStorage.setItem('fluxosdk_user_id', user.id);

      // Limpa os campos
      this.authEmail.set('');
      this.authPassword.set('');

      // Redireciona para o dashboard central
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      this.isAuthLoading.set(false);
    }
  }
}
