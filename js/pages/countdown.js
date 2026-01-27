/**
 * Módulo Index Page (Countdown)
 * Controla a lógica da página de contagem regressiva
 */

import { el } from '../modules/domUtils.js';

class CountdownPage {
  constructor() {
    this.targetDate = new Date("Jan 10, 2026 00:00:00").getTime();
    this.interval = null;
    
    this.daysEl = el('days');
    this.hoursEl = el('hours');
    this.minutesEl = el('minutes');
    this.secondsEl = el('seconds');
  }

  start() {
    this.updateCountdown();
    this.interval = setInterval(() => this.updateCountdown(), 1000);
  }

  updateCountdown() {
    const now = new Date().getTime();
    const distance = this.targetDate - now;

    if (distance < 0) {
      clearInterval(this.interval);
      // Redireciona para página após contagem acabar (se necessário)
      // window.location.href = 'manage.html';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    this.daysEl.innerText = String(days).padStart(2, '0');
    this.hoursEl.innerText = String(hours).padStart(2, '0');
    this.minutesEl.innerText = String(minutes).padStart(2, '0');
    this.secondsEl.innerText = String(seconds).padStart(2, '0');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}

// Instancia a página quando DOM estiver pronto
let countdownPage;
document.addEventListener('DOMContentLoaded', () => {
  countdownPage = new CountdownPage();
  countdownPage.start();
});

// Permite parar a contagem se necessário
window.stopCountdown = () => {
  if (countdownPage) countdownPage.stop();
};
