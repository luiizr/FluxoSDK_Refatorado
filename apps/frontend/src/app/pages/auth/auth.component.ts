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
  protected authName = signal<string>('');
  protected authEmail = signal<string>('');
  protected authPassword = signal<string>('');
  protected authConfirmPassword = signal<string>('');
  protected errorMessage = signal<string>('');

  validateForm(): boolean {
    this.errorMessage.set('');
    
    if (this.isRegistering() && !this.authName()) {
      this.errorMessage.set('Por favor, informe seu nome.');
      return false;
    }

    if (!this.authEmail()) {
      this.errorMessage.set('Por favor, informe seu e-mail.');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.authEmail())) {
      this.errorMessage.set('Por favor, informe um e-mail válido.');
      return false;
    }

    if (!this.authPassword()) {
      this.errorMessage.set('Por favor, informe sua senha.');
      return false;
    }

    if (this.isRegistering()) {
      if (this.authPassword().length < 6) {
        this.errorMessage.set('A senha deve ter no mínimo 6 caracteres.');
        return false;
      }
      
      if (this.authPassword() !== this.authConfirmPassword()) {
        this.errorMessage.set('As senhas não coincidem.');
        return false;
      }
    }

    return true;
  }

  async authenticate(event: Event) {
    event.preventDefault();
    if (!this.validateForm()) return;

    this.isAuthLoading.set(true);
    this.errorMessage.set('');
    try {
      let user;
      if (this.isRegistering()) {
        user = await this.authService.register(
          this.authEmail(),
          this.authPassword(),
          this.authName()
        );
      } else {
        user = await this.authService.login(
          this.authEmail(),
          this.authPassword()
        );
      }

      localStorage.setItem('fluxosdk_user_id', user.id);
      localStorage.setItem('fluxosdk_user_name', user.name || '');
      localStorage.setItem('fluxosdk_user_email', user.email);
      localStorage.setItem('fluxosdk_user_is_root', String(Boolean(user.is_root)));
      // Se tivéssemos foto de perfil, is_root, etc, poderíamos salvar aqui também

      // Limpa os campos
      this.authName.set('');
      this.authEmail.set('');
      this.authPassword.set('');
      this.authConfirmPassword.set('');

      // Redireciona para o dashboard central
      await this.router.navigate(['/dashboard']);
    } catch (error: any) {
      console.error(error);
      const msg = error.message?.toLowerCase() || '';
      
      if (msg.includes('não cadastrado')) {
        this.errorMessage.set('Este e-mail não está cadastrado.');
      } else if (msg.includes('senha incorreta')) {
        this.errorMessage.set('Senha incorreta.');
      } else if (msg.includes('invalid') || msg.includes('inválido')) {
        this.errorMessage.set('E-mail ou senha incorretos.');
      } else if (msg.includes('exists') || msg.includes('existente') || msg.includes('duplicate') || msg.includes('duplicado') || msg.includes('already')) {
        this.errorMessage.set('Este e-mail já está cadastrado.');
      } else {
        this.errorMessage.set(`Erro: ${error.message || 'Erro inesperado'}`);
      }
    } finally {
      this.isAuthLoading.set(false);
    }
  }
}
