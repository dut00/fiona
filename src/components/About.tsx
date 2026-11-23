import { useEffect, type ReactNode } from 'react'
import { useI18n, type Lang } from '../i18n'

interface Section {
  title: string
  body: ReactNode
}

const Formula = ({ children }: { children: ReactNode }) => (
  <div className="my-2 overflow-x-auto rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 font-mono text-sm text-cyan-200 whitespace-nowrap">
    {children}
  </div>
)

const content: Record<Lang, { title: string; intro: string; sections: Section[] }> = {
  pl: {
    title: 'Jak to działa?',
    intro:
      'Fiona szuka częstotliwości, przy której przedmiot (np. kieliszek) drga najchętniej, a potem gra dokładnie ten dźwięk, żeby wprowadzić go w rezonans. Wszystko liczy się w przeglądarce — nagrania nigdzie nie są wysyłane.',
    sections: [
      {
        title: '🔔 Rezonans',
        body: (
          <>
            <p>
              Każdy sprężysty przedmiot ma swoje <b>częstotliwości drgań własnych</b> — to dlatego kieliszek po stuknięciu
              „dzwoni” konkretnym tonem. Jeśli pobudzamy go dźwiękiem o dokładnie tej częstotliwości, każda kolejna fala
              dokłada energii do drgań, tak jak popychanie huśtawki w odpowiednim momencie.
            </p>
            <p>
              Szkło ma bardzo wysoką <b>dobroć (Q ≈ 1000+)</b>: rezonans jest silny, ale wąski — pasmo bywa węższe niż 1 Hz.
              Dlatego potrzebny jest precyzyjny pomiar i dostrajanie.
            </p>
          </>
        ),
      },
      {
        title: '🎤 1. Nagranie stuknięcia',
        body: (
          <p>
            Mikrofon (bez redukcji szumów i echa) nasłuchuje ciągle. Gdy głośność (RMS) skoczy ~6× ponad tło, aplikacja
            uznaje to za stuknięcie, pomija pierwsze ~20 ms (sam trzask uderzenia, który zawiera wszystkie częstotliwości)
            i zapisuje ~1 s wybrzmiewania.
          </p>
        ),
      },
      {
        title: '〰️ 2. Transformata Fouriera',
        body: (
          <>
            <p>
              Każdy sygnał da się zapisać jako sumę sinusoid. <b>Dyskretna transformata Fouriera (DFT)</b> mówi, jak silna
              jest każda z nich:
            </p>
            <Formula>X[k] = Σ x[n] · e^(−2πi·k·n/N), n = 0…N−1</Formula>
            <p>
              Liczenie tego wprost wymaga N² operacji. <b>FFT</b> (algorytm Cooleya–Tukeya) dzieli problem na połowy
              i robi to samo w N·log₂N — dla N = 65 536 to ok. 4000× szybciej.
            </p>
            <p>Przed transformatą:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <b>okno Hanna</b> łagodnie wycisza brzegi nagrania, żeby ucięcie sygnału nie tworzyło fałszywych
                częstotliwości (przeciek widma),
              </li>
              <li>
                <b>dopełnienie zerami</b> do 65 536 próbek zagęszcza siatkę częstotliwości:
              </li>
            </ul>
            <Formula>Δf = 48 000 Hz / 65 536 ≈ 0,73 Hz</Formula>
            <p>
              Wynik to <b>widmo</b> — wykres, który widzisz po pomiarze.
            </p>
          </>
        ),
      },
      {
        title: '📈 3. Szukanie szczytów',
        body: (
          <>
            <p>
              W zakresie 150–8000 Hz aplikacja szuka lokalnych maksimów, które wystają co najmniej 10 dB ponad otoczenie
              i nie są więcej niż 40 dB słabsze od najsilniejszego (resztę uznaje za szum). Najsilniejszy szczyt to
              domyślny wynik, pozostałe to wyższe mody drgań — można je wybrać, stukając w wykres.
            </p>
            <p>
              Żeby wyjść poza dokładność siatki 0,73 Hz, przez trzy najwyższe punkty szczytu (w dB) prowadzona jest
              parabola — jej wierzchołek daje częstotliwość z dokładnością ok. 0,1 Hz.
            </p>
          </>
        ),
      },
      {
        title: '🎯 4. Dostrajanie',
        body: (
          <>
            <p>
              Stuknięcie daje dobre przybliżenie, ale szkło grane głośnikiem może zareagować przy minimalnie innej
              częstotliwości. Dlatego aplikacja gra ton i jednocześnie słucha, jak głośno odpowiada szkło.
            </p>
            <p>
              Do pomiaru głośności przy jednej, konkretnej częstotliwości używa <b>algorytmu Goertzela</b> — to jakby
              policzyć tylko jeden „słupek” FFT, zamiast całego widma.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>najpierw sprawdza punkty co 0,5 Hz w zakresie ±1,5 Hz od pomiaru,</li>
              <li>potem „wspina się” w stronę głośniejszej odpowiedzi, za każdym razem zmniejszając krok o połowę, aż do 0,05 Hz,</li>
              <li>kończy się samo — maksymalnie 30 pomiarów, zwykle ok. 3 s.</li>
            </ul>
            <p>Wynik „+X dB” mówi, o ile szkło przy rezonansie odpowiada głośniej niż w najcichszym zmierzonym punkcie.</p>
          </>
        ),
      },
      {
        title: '⚠️ Ograniczenia',
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>Głośnik telefonu zwykle jest za słaby, żeby zbić szkło — usłyszysz, że kieliszek „śpiewa”.</li>
            <li>Mikrofon słyszy też sam głośnik, dlatego liczy się względne maksimum w wąskim zakresie.</li>
            <li>Rezonans lekko dryfuje z temperaturą i ilością płynu w naczyniu.</li>
            <li>Dźwięk wyłącza się sam po 60 s, żeby chronić słuch.</li>
          </ul>
        ),
      },
      {
        title: '🛠️ Technologia',
        body: (
          <p>
            Web Audio API (AudioWorklet do nagrywania, OscillatorNode do grania), własna implementacja FFT i Goertzela
            w TypeScripcie, React + Tailwind CSS, PWA działająca offline.
          </p>
        ),
      },
    ],
  },
  en: {
    title: 'How does it work?',
    intro:
      'Fiona finds the frequency at which an object (e.g. a wine glass) vibrates most easily, then plays exactly that tone to drive it into resonance. Everything is computed in your browser — recordings are never sent anywhere.',
    sections: [
      {
        title: '🔔 Resonance',
        body: (
          <>
            <p>
              Every elastic object has its own <b>natural frequencies</b> — that is why a glass “rings” with a specific
              pitch when tapped. If you drive it with sound at exactly that frequency, each wave adds energy to the
              vibration, like pushing a swing at just the right moment.
            </p>
            <p>
              Glass has a very high <b>quality factor (Q ≈ 1000+)</b>: the resonance is strong but narrow — often less
              than 1 Hz wide. That is why precise measurement and tuning are needed.
            </p>
          </>
        ),
      },
      {
        title: '🎤 1. Recording the tap',
        body: (
          <p>
            The microphone (with noise suppression and echo cancellation off) listens continuously. When the loudness
            (RMS) jumps ~6× above the background, the app treats it as a tap, skips the first ~20 ms (the click of the
            impact itself, which contains every frequency) and records ~1 s of the ringing.
          </p>
        ),
      },
      {
        title: '〰️ 2. Fourier transform',
        body: (
          <>
            <p>
              Any signal can be written as a sum of sine waves. The <b>discrete Fourier transform (DFT)</b> tells how
              strong each of them is:
            </p>
            <Formula>X[k] = Σ x[n] · e^(−2πi·k·n/N), n = 0…N−1</Formula>
            <p>
              Computing it directly takes N² operations. The <b>FFT</b> (Cooley–Tukey algorithm) keeps splitting the
              problem in halves and does the same in N·log₂N — for N = 65,536 that is ~4000× faster.
            </p>
            <p>Before the transform:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                a <b>Hann window</b> gently fades the edges of the recording so that cutting the signal does not create
                fake frequencies (spectral leakage),
              </li>
              <li>
                <b>zero-padding</b> to 65,536 samples makes the frequency grid denser:
              </li>
            </ul>
            <Formula>Δf = 48,000 Hz / 65,536 ≈ 0.73 Hz</Formula>
            <p>
              The result is the <b>spectrum</b> — the chart you see after measuring.
            </p>
          </>
        ),
      },
      {
        title: '📈 3. Finding peaks',
        body: (
          <>
            <p>
              Between 150 and 8000 Hz the app looks for local maxima that stand at least 10 dB above their surroundings
              and are no more than 40 dB below the strongest one (the rest is treated as noise). The strongest peak is
              the default result; the others are higher vibration modes — tap the chart to pick one.
            </p>
            <p>
              To beat the 0.73 Hz grid, a parabola is fitted through the three highest points of the peak (in dB) — its
              vertex gives the frequency to about 0.1 Hz.
            </p>
          </>
        ),
      },
      {
        title: '🎯 4. Tuning',
        body: (
          <>
            <p>
              A tap gives a good estimate, but a glass driven by a speaker may respond at a slightly different
              frequency. So the app plays the tone and listens to how loudly the glass answers at the same time.
            </p>
            <p>
              To measure loudness at one specific frequency it uses the <b>Goertzel algorithm</b> — like computing a
              single FFT “bar” instead of the whole spectrum.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>first it checks points every 0.5 Hz within ±1.5 Hz of the measurement,</li>
              <li>then it “climbs” towards the louder response, halving the step each time, down to 0.05 Hz,</li>
              <li>it finishes on its own — at most 30 measurements, usually ~3 s.</li>
            </ul>
            <p>The “+X dB” result says how much louder the glass answers at resonance than at the quietest point measured.</p>
          </>
        ),
      },
      {
        title: '⚠️ Limitations',
        body: (
          <ul className="list-disc pl-5 space-y-1">
            <li>A phone speaker is usually too weak to shatter glass — you will hear the glass “sing”.</li>
            <li>The microphone also hears the speaker directly, so the app looks for a relative maximum in a narrow range.</li>
            <li>The resonance drifts slightly with temperature and the amount of liquid in the glass.</li>
            <li>Sound stops automatically after 60 s to protect your hearing.</li>
          </ul>
        ),
      },
      {
        title: '🛠️ Technology',
        body: (
          <p>
            Web Audio API (AudioWorklet for recording, OscillatorNode for playback), custom FFT and Goertzel
            implementations in TypeScript, React + Tailwind CSS, a PWA that works offline.
          </p>
        ),
      },
    ],
  },
}

export function AboutButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      onClick={onClick}
      aria-label={t('about')}
      title={t('about')}
      className="size-8 rounded-full bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 active:bg-slate-800"
    >
      ?
    </button>
  )
}

export function About({ onClose }: { onClose: () => void }) {
  const { lang, t } = useI18n()
  const c = content[lang]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={onClose} role="dialog" aria-modal aria-label={c.title}>
      <div
        className="max-w-lg mx-auto rounded-3xl bg-slate-900 border border-slate-700 p-5 space-y-5 text-sm leading-relaxed text-slate-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-bold text-white">{c.title}</h2>
          <button onClick={onClose} aria-label={t('close')} className="size-8 shrink-0 rounded-full bg-slate-800 text-slate-300 active:bg-slate-700">
            ✕
          </button>
        </div>
        <p>{c.intro}</p>
        {c.sections.map((s) => (
          <section key={s.title} className="space-y-2">
            <h3 className="text-base font-semibold text-slate-100">{s.title}</h3>
            {s.body}
          </section>
        ))}
        <button onClick={onClose} className="w-full rounded-xl bg-slate-800 py-3 font-medium text-slate-100 active:bg-slate-700">
          {t('close')}
        </button>
      </div>
    </div>
  )
}
