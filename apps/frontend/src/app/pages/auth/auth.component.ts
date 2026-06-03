import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, type LoginPayload, type RegisterPayload } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected isRegistering = signal<boolean>(false);
  protected registrationStep = signal<1 | 2>(1);
  protected isAuthLoading = signal<boolean>(false);
  protected authName = signal<string>('');
  protected authEmail = signal<string>('');
  protected authPassword = signal<string>('');
  protected authConfirmPassword = signal<string>('');
  protected authAvatarPreview = signal<string>('');
  protected authAvatarName = signal<string>('');
  protected authAvatarError = signal<string>('');
  protected acceptTerms = signal<boolean>(false);
  protected errorMessage = signal<string>('');
  private selectedAvatarFile?: File;

  validateBaseRegistration(): boolean {
    this.errorMessage.set('');

    if (!this.authName()) {
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

    if (this.authPassword().length < 6) {
      this.errorMessage.set('A senha deve ter no mínimo 6 caracteres.');
      return false;
    }

    if (this.authPassword() !== this.authConfirmPassword()) {
      this.errorMessage.set('As senhas não coincidem.');
      return false;
    }

    return true;
  }

  validateFinalRegistration(): boolean {
    this.errorMessage.set('');

    if (!this.acceptTerms()) {
      this.errorMessage.set('Você precisa aceitar os termos para continuar.');
      return false;
    }

    return true;
  }

  onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    this.authAvatarError.set('');

    if (!file) {
      this.selectedAvatarFile = undefined;
      this.authAvatarPreview.set('');
      this.authAvatarName.set('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.selectedAvatarFile = undefined;
      this.authAvatarPreview.set('');
      this.authAvatarName.set('');
      this.authAvatarError.set('Selecione um arquivo de imagem válido.');
      if (input) input.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.selectedAvatarFile = undefined;
      this.authAvatarPreview.set('');
      this.authAvatarName.set('');
      this.authAvatarError.set('Use uma imagem de até 2 MB.');
      if (input) input.value = '';
      return;
    }

    this.selectedAvatarFile = file;
    this.authAvatarName.set(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      this.authAvatarPreview.set(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  }

  removePhoto() {
    this.selectedAvatarFile = undefined;
    this.authAvatarPreview.set('');
    this.authAvatarName.set('');
    this.authAvatarError.set('');
  }

  goBackToStepOne() {
    this.registrationStep.set(1);
    this.errorMessage.set('');
  }

  async authenticate(event: Event) {
    event.preventDefault();

    this.errorMessage.set('');

    if (this.isRegistering()) {
      if (this.registrationStep() === 1) {
        if (!this.validateBaseRegistration()) return;
        this.registrationStep.set(2);
        return;
      }

      if (!this.validateFinalRegistration()) return;
    } else if (!this.validateLoginForm()) {
      return;
    }

    this.isAuthLoading.set(true);
    try {
      if (this.isRegistering()) {
        const userPayload: RegisterPayload = {
          name: this.authName().trim(),
          email: this.authEmail().trim(),
          password: this.authPassword(),
        };

        await this.authService.register(userPayload, this.selectedAvatarFile);
      } else {
        const userPayload: LoginPayload = {
          email: this.authEmail().trim(),
          password: this.authPassword(),
        };

        await this.authService.login(userPayload);
      }

      this.resetAuthForm();

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

  protected resetRegistrationFlow() {
    this.registrationStep.set(1);
    this.selectedAvatarFile = undefined;
    this.authAvatarPreview.set('');
    this.authAvatarName.set('');
    this.authAvatarError.set('');
    this.acceptTerms.set(false);
    this.errorMessage.set('');
  }

  private resetAuthForm() {
    this.authName.set('');
    this.authEmail.set('');
    this.authPassword.set('');
    this.authConfirmPassword.set('');
    this.selectedAvatarFile = undefined;
    this.authAvatarPreview.set('');
    this.authAvatarName.set('');
    this.authAvatarError.set('');
    this.acceptTerms.set(false);
    this.registrationStep.set(1);
  }

  private validateLoginForm(): boolean {
    this.errorMessage.set('');

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

    return true;
  }
}
