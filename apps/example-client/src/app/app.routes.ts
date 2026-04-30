import { Route } from '@angular/router';
import { Component } from '@angular/core';

type FluxoSdkApi = {
  track: (name: string, metadata?: Record<string, unknown>) => void;
  identify: (id: string, traits?: Record<string, unknown>) => void;
  trackError: (error: unknown, metadata?: Record<string, unknown>) => void;
};

function sdk(): FluxoSdkApi | null {
  return (window as unknown as { FluxoSDK?: FluxoSdkApi }).FluxoSDK ?? null;
}

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Página Inicial (Home)</h2>
      <p>Use estes botões para gerar eventos de interação, engajamento e custom.</p>
      
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
        <h3>Produtos em Destaque</h3>
        <p>Aqui você encontra as melhores ofertas do dia.</p>
        <button (click)="comprarProduto('Produto A')" data-fluxo-id="buy-product-a" style="background-color: #28a745; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; margin-right: 10px;">
          Comprar Produto A
        </button>
        <button (click)="comprarProduto('Produto B')" data-fluxo-id="buy-product-b" style="background-color: #28a745; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px;">
          Comprar Produto B
        </button>
      </div>

      <div style="margin-top: 30px;">
        <h3>Newsletter</h3>
        <form (submit)="assinarNewsletter($event)" data-fluxo-id="newsletter-form">
          <input type="email" name="newsletter_email" required placeholder="Seu e-mail" style="padding: 8px; width: 200px; margin-right: 10px; border: 1px solid #ced4da; border-radius: 4px;">
          <button type="submit" style="background-color: #007bff; color: white; border: none; padding: 9px 15px; cursor: pointer; border-radius: 4px;">
            Assinar
          </button>
        </form>
      </div>

      <div style="margin-top: 20px;">
        <h3>Identify e custom events</h3>
        <button (click)="identifyUsuario()" style="background:#111827; color:white; border:none; padding:8px 12px; border-radius:4px; margin-right:8px;">FluxoSDK.identify</button>
        <button (click)="trackPlano()" style="background:#8b5cf6; color:white; border:none; padding:8px 12px; border-radius:4px; margin-right:8px;">track plan_selected</button>
        <button (click)="trackCheckoutCompleted()" style="background:#2563eb; color:white; border:none; padding:8px 12px; border-radius:4px;">track checkout_completed</button>
      </div>
    </div>
  `
})
export class HomeComponent {
  comprarProduto(produto: string) {
    sdk()?.track('product_clicked', { funnel: 'compra', step: 'produto_clicado', produto });
    alert(`Você clicou para comprar o ${produto}`);
  }

  assinarNewsletter(event: Event) {
    event.preventDefault();
    sdk()?.track('newsletter_subscribed', { funnel: 'assinatura', step: 'submit_newsletter' });
    alert('Inscrito na newsletter com sucesso!');
  }

  identifyUsuario() {
    sdk()?.identify('user_12345', {
      plan: 'pro',
      role: 'owner',
      accountAgeDays: 42,
    });
  }

  trackPlano() {
    sdk()?.track('plan_selected', {
      funnel: 'assinatura',
      step: 'plano_escolhido',
      plan: 'pro',
      price: 99,
    });
  }

  trackCheckoutCompleted() {
    sdk()?.track('checkout_completed', {
      funnel: 'checkout',
      step: 'checkout_finalizado',
      value: 259.9,
      currency: 'BRL',
      items: 2,
    });
  }
}

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Sobre Nós</h2>
      <p>Conheça mais sobre a nossa empresa e os nossos valores.</p>
      <ul>
        <li>Inovação</li>
        <li>Comprometimento</li>
        <li>Transparência</li>
      </ul>
      <a href="/contato" data-fluxo-id="ghost-link" style="color: blue; text-decoration: underline;" (click)="$event.preventDefault()">
        Clique aqui para ver um link fantasma
      </a>
      <div style="margin-top: 20px;">
        <button style="padding: 10px; cursor: pointer;" (click)="lerMais()">Ler Mais sobre a História</button>
        <button style="padding: 10px; cursor: pointer; margin-left: 8px;" (click)="gerarErroManual()">Gerar erro JS manual</button>
      </div>
    </div>
  `
})
export class AboutComponent {
  lerMais() {
    alert('Mostrando mais história da empresa...');
  }

  gerarErroManual() {
    sdk()?.trackError(new Error('Erro manual de teste da página Sobre'), {
      context: 'about_page_button',
      severity: 'warning',
    });
  }
}

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Fale Conosco</h2>
      <p>Envie-nos uma mensagem, crítica ou sugestão.</p>
      
      <form style="display: flex; flex-direction: column; width: 300px;" (submit)="enviarMensagem($event)" data-fluxo-id="contact-form">
        <label style="margin-top: 10px;">Nome</label>
        <input type="text" name="contact_name" required placeholder="Como devemos te chamar?" style="padding: 8px;" />
        
        <label style="margin-top: 10px;">Mensagem</label>
        <textarea rows="4" name="contact_message" required minlength="10" placeholder="Escreva aqui..." style="padding: 8px;"></textarea>

        <button type="submit" style="margin-top: 15px; padding: 10px; cursor: pointer; background: #ffc107; border: none;">
          Enviar Mensagem
        </button>
      </form>

      <div style="margin-top: 20px;">
        <button (click)="simularApiError()" style="padding: 10px; cursor: pointer; background: #dc2626; color: white; border: none; border-radius: 4px;">
          Simular API error (status 500)
        </button>
      </div>
    </div>
  `
})
export class ContactComponent {
  enviarMensagem(event: Event) {
    event.preventDefault();
    sdk()?.track('contact_message_sent', {
      funnel: 'onboarding',
      step: 'mensagem_enviada',
      channel: 'site_form',
    });
    alert('Mensagem enviada com sucesso!');
  }

  async simularApiError() {
    try {
      await fetch('https://httpstat.us/500');
    } catch {
      // ignora erro de rede; o SDK deve registrar api_error quando habilitado.
    }
  }
}

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Checkout (Funil)</h2>
      <p>Dispare etapas para validar início, avanço, drop-off e conversão final.</p>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button (click)="step('checkout_started')" style="padding: 10px;">Iniciar checkout</button>
        <button (click)="step('address_completed')" style="padding: 10px;">Endereço OK</button>
        <button (click)="step('payment_selected')" style="padding: 10px;">Pagamento escolhido</button>
        <button (click)="step('checkout_abandoned')" style="padding: 10px; background: #ef4444; color: white; border: none;">Abandonar</button>
        <button (click)="step('checkout_completed')" style="padding: 10px; background: #10b981; color: white; border: none;">Converter</button>
      </div>
    </div>
  `,
})
export class CheckoutComponent {
  step(stepName: string) {
    sdk()?.track(stepName, {
      funnel: 'checkout',
      step: stepName,
      checkoutId: 'chk_001',
    });
  }
}

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Performance e contexto</h2>
      <p>Use para gerar cliques repetidos (rage) e dead click em elemento sem ação.</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button style="padding: 10px;" (click)="ping()">Clique normal</button>
        <button style="padding: 10px;" (click)="trackOnboarding()">Track onboarding_step</button>
        <div style="padding: 10px; border: 1px dashed #777;" data-fluxo-id="dead-zone">Área sem ação (dead click)</div>
      </div>
    </div>
  `,
})
export class LabComponent {
  ping() {
    // clique normal
  }

  trackOnboarding() {
    sdk()?.track('onboarding_step_completed', {
      funnel: 'onboarding',
      step: 'profile_completed',
      progress: 60,
    });
  }
}

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'sobre', component: AboutComponent },
  { path: 'contato', component: ContactComponent },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'lab', component: LabComponent },
];
