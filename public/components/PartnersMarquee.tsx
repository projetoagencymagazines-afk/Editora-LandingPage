"use client";

import { useEffect, useRef } from "react";
import partnersData from "../data/partners.json";

interface Partner {
  name: string;
  logo: string;
  url: string; // vazio = logo sem link
}

const PARTNERS = partnersData as Partner[];

const TITULO = "Empresas parceiras";

// Acima disso, divide em duas fileiras (cada uma anda pra um lado)
const LIMITE_UMA_FILEIRA = 14;

// Cada "cópia" da fileira precisa ser mais larga que qualquer tela,
// senão aparece um buraco no loop. Se tiver poucos logos, repete a lista.
const LARGURA_MINIMA_COPIA = 3600;
const PASSO_ESTIMADO = 240; // px por logo (card + espaço)

const VELOCIDADE = 45; // px por segundo

function Logo({ partner, oculto }: { partner: Partner; oculto: boolean }) {
  const caixa =
    "flex h-[96px] w-[170px] sm:h-[120px] sm:w-[220px] shrink-0 items-center justify-center " +
    "rounded-[4px] border border-border bg-white p-3 sm:p-4 transition " +
    "hover:border-gold hover:shadow-md";

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={partner.logo}
      alt={oculto ? "" : partner.name}
      loading="lazy"
      decoding="async"
      draggable={false}
      className="max-h-full max-w-full object-contain"
    />
  );

  if (partner.url) {
    return (
      <a
        href={partner.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visitar site de ${partner.name}`}
        tabIndex={oculto ? -1 : undefined}
        draggable={false}
        className={caixa}
      >
        {img}
      </a>
    );
  }

  return <div className={caixa}>{img}</div>;
}

function MarqueeRow({
  items,
  direction,
}: {
  items: Partner[];
  direction: 1 | -1; // 1 = logos andam pra esquerda, -1 = pra direita
}) {
  const viewportRef = useRef<HTMLDivElement>(null);

  const repeticoes = Math.max(
    1,
    Math.ceil(LARGURA_MINIMA_COPIA / (items.length * PASSO_ESTIMADO))
  );
  const unidade = Array.from({ length: repeticoes }, () => items).flat();

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    el.style.scrollBehavior = "auto";
    const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");

    // O conteúdo tem 3 cópias seguidas. A posição fica sempre na cópia do meio
    // [W, 2W): ao chegar numa borda, pula W pixels e o olho não percebe,
    // porque as cópias são idênticas. Isso dá loop infinito nos dois sentidos.
    let W = 0; // largura de UMA cópia
    let pos = 0; // posição com casas decimais (scrollLeft arredonda)
    let raf = 0;
    let ultimo = 0;

    let mouseEmCima = false;
    let focoDentro = false;
    let arrastando = false;
    let tocando = false;
    let visivel = true;
    let retomaEm = 0; // instante em que o movimento automático volta
    let arrastouDeVerdade = false; // pra cancelar o clique depois de um arraste

    const normalizar = (x: number) => (x >= 2 * W ? x - W : x < W ? x + W : x);

    const medir = () => {
      const nova = el.scrollWidth / 3;
      if (nova <= 0 || nova === W) return;
      const proporcao = W > 0 ? el.scrollLeft / W : 1;
      W = nova;
      pos = proporcao * W;
      el.scrollLeft = pos;
    };

    const tick = (agora: number) => {
      const dt = ultimo ? Math.min(agora - ultimo, 64) / 1000 : 0;
      ultimo = agora;

      if (W > 0) {
        const pausado =
          arrastando ||
          tocando ||
          mouseEmCima ||
          focoDentro ||
          !visivel ||
          agora < retomaEm ||
          reduzMovimento.matches;

        if (!pausado) {
          pos = normalizar(pos + direction * VELOCIDADE * dt);
          el.scrollLeft = pos;
        } else {
          // Alguém está mexendo (ou está pausado): acompanha a posição real
          const atual = el.scrollLeft;
          const ajustada = normalizar(atual);
          if (ajustada !== atual) el.scrollLeft = ajustada;
          pos = ajustada;
        }
      }
      raf = requestAnimationFrame(tick);
    };

    // ---------- Arrastar com o mouse ----------
    // (no celular o deslize do dedo já é nativo; aqui só o mouse)
    const LIMIAR = 5; // px de movimento pra contar como arraste (e não como clique)
    let inicioX = 0;
    let inicioScroll = 0;
    let arrasteAtivo = false;

    const aoMover = (e: PointerEvent) => {
      const dx = e.clientX - inicioX;
      if (!arrasteAtivo) {
        if (Math.abs(dx) < LIMIAR) return;
        arrasteAtivo = true;
        arrastando = true;
        arrastouDeVerdade = true;
        el.classList.add("is-dragging");
      }
      let alvo = inicioScroll - dx;
      if (alvo >= 2 * W) {
        inicioScroll -= W;
        alvo -= W;
      } else if (alvo < W) {
        inicioScroll += W;
        alvo += W;
      }
      el.scrollLeft = alvo;
    };

    const aoSoltar = () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
      window.removeEventListener("pointercancel", aoSoltar);
      if (arrasteAtivo) {
        arrasteAtivo = false;
        arrastando = false;
        el.classList.remove("is-dragging");
        retomaEm = performance.now() + 400;
      }
    };

    const aoApertar = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      arrastouDeVerdade = false;
      arrasteAtivo = false;
      inicioX = e.clientX;
      inicioScroll = el.scrollLeft;
      window.addEventListener("pointermove", aoMover);
      window.addEventListener("pointerup", aoSoltar);
      window.addEventListener("pointercancel", aoSoltar);
    };

    // Depois de arrastar, o navegador dispara um "clique" no logo embaixo do mouse.
    // Cancela esse clique pra não abrir o site sem querer.
    const aoClicar = (e: MouseEvent) => {
      if (arrastouDeVerdade) {
        e.preventDefault();
        e.stopPropagation();
        arrastouDeVerdade = false;
      }
    };

    // ---------- Pausas ----------
    const aoEntrar = (e: PointerEvent) => {
      if (e.pointerType === "mouse") mouseEmCima = true;
    };
    const aoSair = (e: PointerEvent) => {
      if (e.pointerType === "mouse") {
        mouseEmCima = false;
        retomaEm = performance.now() + 200;
      }
    };
    const aoTocar = () => {
      tocando = true;
    };
    const aoPararToque = () => {
      tocando = false;
      retomaEm = performance.now() + 2000; // deixa a inércia do dedo acabar
    };
    const aoRolar = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        retomaEm = performance.now() + 1200;
      }
    };
    const aoFocar = (e: FocusEvent) => {
      // Só pausa pra foco de TECLADO (Tab). Clicar num logo também dá foco ao
      // link, e isso não pode deixar o carrossel congelado depois.
      if ((e.target as HTMLElement).matches(":focus-visible")) focoDentro = true;
    };
    const aoDesfocar = () => {
      focoDentro = false;
    };
    const semArrastarImagem = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", aoApertar);
    el.addEventListener("click", aoClicar, true);
    el.addEventListener("pointerenter", aoEntrar);
    el.addEventListener("pointerleave", aoSair);
    el.addEventListener("touchstart", aoTocar, { passive: true });
    el.addEventListener("touchend", aoPararToque, { passive: true });
    el.addEventListener("touchcancel", aoPararToque, { passive: true });
    el.addEventListener("wheel", aoRolar, { passive: true });
    el.addEventListener("focusin", aoFocar);
    el.addEventListener("focusout", aoDesfocar);
    el.addEventListener("dragstart", semArrastarImagem);

    const ro = new ResizeObserver(medir);
    ro.observe(el);

    // Não gasta processamento quando a seção está fora da tela
    const io = new IntersectionObserver(([entrada]) => {
      visivel = entrada.isIntersecting;
    });
    io.observe(el);

    medir();
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      aoSoltar();
      el.removeEventListener("pointerdown", aoApertar);
      el.removeEventListener("click", aoClicar, true);
      el.removeEventListener("pointerenter", aoEntrar);
      el.removeEventListener("pointerleave", aoSair);
      el.removeEventListener("touchstart", aoTocar);
      el.removeEventListener("touchend", aoPararToque);
      el.removeEventListener("touchcancel", aoPararToque);
      el.removeEventListener("wheel", aoRolar);
      el.removeEventListener("focusin", aoFocar);
      el.removeEventListener("focusout", aoDesfocar);
      el.removeEventListener("dragstart", semArrastarImagem);
    };
  }, [direction]);

  return (
    <div ref={viewportRef} className="marquee-viewport">
      <div className="flex w-max py-2">
        {[0, 1, 2].map((copia) => (
          <ul
            key={copia}
            className="flex shrink-0 items-center gap-4 pr-4"
            // Só a cópia do meio é "de verdade" pra leitor de tela e teclado
            aria-hidden={copia !== 1}
            aria-label={copia === 1 ? TITULO : undefined}
          >
            {unidade.map((p, i) => (
              <li key={`${copia}-${i}`}>
                <Logo partner={p} oculto={copia !== 1} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export default function PartnersMarquee() {
  if (PARTNERS.length === 0) return null;

  // A ordem do partners.json é a ordem na tela. Com muitos logos, as duas
  // fileiras alternam (1º em cima, 2º embaixo, 3º em cima...).
  const duasFileiras = PARTNERS.length > LIMITE_UMA_FILEIRA;
  const fileiraA = duasFileiras
    ? PARTNERS.filter((_, i) => i % 2 === 0)
    : PARTNERS;
  const fileiraB = duasFileiras ? PARTNERS.filter((_, i) => i % 2 === 1) : [];

  return (
    <section
      id="parceiros"
      className="w-full overflow-hidden border-y border-border bg-cream py-16"
    >
      <div className="mx-auto mb-10 max-w-[1240px] px-4 text-center">
        <h2 className="font-sans text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-ink md:text-[36px]">
          {TITULO}
        </h2>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-light">
          Arraste para ver mais
          <span className="hidden sm:inline"> · Clique para visitar o site</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <MarqueeRow items={fileiraA} direction={1} />
        {fileiraB.length > 0 && <MarqueeRow items={fileiraB} direction={-1} />}
      </div>
    </section>
  );
}
