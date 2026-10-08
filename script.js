// Menu mobile
const cabecalho = document.querySelector('.cabecalho');
const toggle = document.querySelector('.menu-toggle');

toggle.addEventListener('click', () => {
  const aberto = cabecalho.classList.toggle('aberto');
  toggle.setAttribute('aria-expanded', aberto);
  toggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
});

document.querySelectorAll('.nav a').forEach((link) =>
  link.addEventListener('click', () => {
    cabecalho.classList.remove('aberto');
    toggle.setAttribute('aria-expanded', false);
    toggle.setAttribute('aria-label', 'Abrir menu');
  })
);

// Tooltips "O que os pais dizem": hover, foco ou toque; só um aberto por vez
let dicaAberta = null;

function abrirDica(el) {
  if (dicaAberta && dicaAberta !== el) fecharDica(dicaAberta);
  el.classList.add('aberta');
  dicaAberta = el;
}

function fecharDica(el) {
  el.classList.remove('aberta');
  if (dicaAberta === el) dicaAberta = null;
}

document.querySelectorAll('.card-dor__rodape').forEach((el) => {
  const botao = el.querySelector('button');
  el.addEventListener('mouseenter', () => abrirDica(el));
  el.addEventListener('mouseleave', () => fecharDica(el));
  botao.addEventListener('focus', () => abrirDica(el));
  botao.addEventListener('blur', () => fecharDica(el));
  botao.addEventListener('click', () => abrirDica(el)); // toque no mobile
});

// toque fora fecha (pointerdown também dispara no iOS, ao contrário do click)
document.addEventListener('pointerdown', (e) => {
  if (dicaAberta && !dicaAberta.contains(e.target)) fecharDica(dicaAberta);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && dicaAberta) fecharDica(dicaAberta);
});

// Cards "Para cada fase": abre/fecha "Como o atendimento acontece" (cada card independente)
document.querySelectorAll('.card-fase__toggle').forEach((botao) => {
  botao.addEventListener('click', () => {
    const aberto = botao.closest('.card-fase').classList.toggle('aberto');
    botao.setAttribute('aria-expanded', aberto);
  });
});

// Depoimentos: clona a lista para o carrossel rodar sem emendas (sem JS, fica estático)
const trilhoDepo = document.querySelector('.depo-trilho');
if (trilhoDepo) {
  const lista = trilhoDepo.querySelector('.depo-lista');
  for (let i = 0; i < 3; i++) {
    const copia = lista.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    trilhoDepo.append(copia);
  }
  trilhoDepo.classList.add('rolando');
}

// Citação do "Sobre mim": separa as palavras para escurecerem uma a uma com o scroll
const citacao = document.querySelector('.sobre-citacao blockquote');
if (citacao) {
  const palavras = citacao.textContent.trim().split(/\s+/);
  citacao.style.setProperty('--n', palavras.length);
  citacao.replaceChildren(...palavras.flatMap((texto, i) => {
    const span = document.createElement('span');
    span.className = 'palavra';
    span.style.setProperty('--i', i);
    span.textContent = texto;
    return i ? [' ', span] : [span];
  }));
}

// Entradas ao rolar: cada bloco aparece com um movimento suave quando entra na tela
if (document.documentElement.classList.contains('revela')) {
  const grupos = {
    sobe: '.cabecalho-duplo > *, .fases-cabecalho > *, .depo-cabecalho > *, .faq-cabecalho > *,' +
          '.cf-conteudo > :not(.etapas), .familia-conteudo > :not(.familia-lista), .sobre-conteudo > *,' +
          '.card-dor, .dores-faixa, .etapa, .card-fase, .fases .btn-cta, .familia-item,' +
          '.depo-carrossel, .depo-rodape, .card-servico, .servicos-rodape, .faq-item, .faq-contato, .cta-card__texto > *,' +
          '.rodape .container > *',
    esq: '.cf-foto, .sobre-foto',
    dir: '.familia-foto, .cta-card__foto',
    selo: '.sobre-selo',
  };

  const observador = new IntersectionObserver((entradas) => {
    entradas
      .filter((e) => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      .forEach((e, i) => {
        e.target.style.setProperty('--i', Math.min(i, 6));
        e.target.classList.add('visivel');
        observador.unobserve(e.target);
      });
  }, { rootMargin: '0px 0px -8% 0px' });

  for (const [tipo, seletor] of Object.entries(grupos)) {
    document.querySelectorAll(seletor).forEach((el) => {
      el.dataset.revela = tipo;
      observador.observe(el);
      // terminada a entrada, o bloco volta ao estilo normal
      el.addEventListener('animationend', (e) => {
        if (e.target !== el || e.pseudoElement || !e.animationName.startsWith('revela')) return;
        el.removeAttribute('data-revela');
        el.classList.remove('visivel');
        el.style.removeProperty('--i');
      });
    });
  }
}

// Família no processo: cada item tem uma foto; elas trocam sozinhas a cada 6s
// (a barrinha do item atual enche e, ao terminar, passa para o próximo)
const familia = document.querySelector('.familia');
if (familia) {
  const itens = [...familia.querySelectorAll('.familia-item[data-foto]')];
  const fotos = [...familia.querySelectorAll('.familia-slide')];
  const barras = [...familia.querySelectorAll('.familia-progresso span')];
  let atual = 0;

  const mostrar = (i) => {
    atual = i;
    itens.forEach((el, n) => {
      el.classList.toggle('ativo', n === i);
      if (n === i) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });
    fotos.forEach((el, n) => el.classList.toggle('ativo', n === i));
    barras.forEach((el, n) => { el.classList.toggle('feito', n < i); el.classList.remove('atual'); });
    void barras[i].offsetWidth; // reinicia a animação da barra
    barras[i].classList.add('atual');
  };
  const pausar = (i) => { familia.classList.add('pausado'); mostrar(i); };
  const retomar = () => { familia.classList.remove('pausado'); mostrar(atual); };

  barras.forEach((b) => b.addEventListener('animationend', (e) => {
    if (e.animationName === 'familia-carregar') mostrar((atual + 1) % itens.length);
  }));

  itens.forEach((el, i) => {
    // mouse em cima: troca na hora e a contagem para; ao sair, recomeça dali
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pausar(i); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') retomar(); });
    // toque no celular: troca na hora e a contagem recomeça daquele item
    el.addEventListener('click', () => { if (!familia.classList.contains('pausado')) mostrar(i); });
    // teclado (Tab): igual ao mouse
    el.addEventListener('focus', () => { if (el.matches(':focus-visible')) pausar(i); });
    el.addEventListener('blur', () => { if (familia.classList.contains('pausado') && !el.matches(':hover')) retomar(); });
  });

  // fora da tela o tempo não corre
  new IntersectionObserver(([e]) => familia.classList.toggle('fora', !e.isIntersecting)).observe(familia);
  mostrar(0);
}
