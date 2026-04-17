import { Route } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Página Inicial (Home)</h2>
      <p>Bem vindos à página principal da nossa loja virtual fake!</p>
      
      <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
        <h3>Produtos em Destaque</h3>
        <p>Aqui você encontra as melhores ofertas do dia.</p>
        <button (click)="comprarProduto('Produto A')" style="background-color: #28a745; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px; margin-right: 10px;">
          Comprar Produto A
        </button>
        <button (click)="comprarProduto('Produto B')" style="background-color: #28a745; color: white; border: none; padding: 10px 15px; cursor: pointer; border-radius: 4px;">
          Comprar Produto B
        </button>
      </div>

      <div style="margin-top: 30px;">
        <h3>Newsletter</h3>
        <form (submit)="assinarNewsletter($event)">
          <input type="email" placeholder="Seu e-mail" style="padding: 8px; width: 200px; margin-right: 10px; border: 1px solid #ced4da; border-radius: 4px;">
          <button type="submit" style="background-color: #007bff; color: white; border: none; padding: 9px 15px; cursor: pointer; border-radius: 4px;">
            Assinar
          </button>
        </form>
      </div>
    </div>
  `
})
export class HomeComponent {
  comprarProduto(produto: string) {
    alert(`Você clicou para comprar o ${produto}`);
  }

  assinarNewsletter(event: Event) {
    event.preventDefault();
    alert('Inscrito na newsletter com sucesso!');
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
      <a href="/contato" style="color: blue; text-decoration: underline;" (click)="$event.preventDefault()">
        Clique aqui para ver um link fantasma
      </a>
      <div style="margin-top: 20px;">
        <button style="padding: 10px; cursor: pointer;" (click)="lerMais()">Ler Mais sobre a História</button>
      </div>
    </div>
  `
})
export class AboutComponent {
  lerMais() {
    alert('Mostrando mais história da empresa...');
  }
}

@Component({
  standalone: true,
  template: `
    <div style="padding: 20px;">
      <h2>Fale Conosco</h2>
      <p>Envie-nos uma mensagem, crítica ou sugestão.</p>
      
      <form style="display: flex; flex-direction: column; width: 300px;" (submit)="enviarMensagem($event)">
        <label style="margin-top: 10px;">Nome</label>
        <input type="text" placeholder="Como devemos te chamar?" style="padding: 8px;" />
        
        <label style="margin-top: 10px;">Mensagem</label>
        <textarea rows="4" placeholder="Escreva aqui..." style="padding: 8px;"></textarea>

        <button type="submit" style="margin-top: 15px; padding: 10px; cursor: pointer; background: #ffc107; border: none;">
          Enviar Mensagem
        </button>
      </form>
    </div>
  `
})
export class ContactComponent {
  enviarMensagem(event: Event) {
    event.preventDefault();
    alert('Mensagem enviada com sucesso!');
  }
}

export const appRoutes: Route[] = [
  { path: '', component: HomeComponent },
  { path: 'sobre', component: AboutComponent },
  { path: 'contato', component: ContactComponent }
];
