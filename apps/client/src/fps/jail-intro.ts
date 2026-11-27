import { JAIL_INTRO_VIDEO, JAIL_INTRO_POSTER } from "./jail-intro-state";
import "./jail-intro.css";
export function createJailIntro() {
  let cancel: (() => void) | undefined;
  return {
    abort() {
      cancel?.();
    },
    play(settings: {
      muted: boolean;
      volume: number;
    }): Promise<"finished" | "aborted"> {
      cancel?.();
      return new Promise((resolve) => {
        const overlay = document.createElement("section");
        overlay.id = "jail-intro";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Release from jail cinematic");
        overlay.innerHTML = `<video playsinline preload="auto" aria-label="Two police officers escort your character out of the jail gate"></video><div class="intro-top"><span>SURVIVE THE BLOCK</span><button type="button" class="intro-skip">SKIP INTRO</button></div><div class="intro-caption" aria-live="polite"><small>JAIL ISLAND</small><h2>YOUR SENTENCE IS OVER.</h2><p>Keep your head down. The block is waiting.</p></div><div class="intro-recovery" hidden><p role="status"></p><button type="button" class="intro-play">PLAY INTRO</button><button type="button" class="intro-continue">CONTINUE TO THE BLOCK</button></div>`;
        const video = overlay.querySelector("video")!,
          skip = overlay.querySelector<HTMLButtonElement>(".intro-skip")!,
          recovery = overlay.querySelector<HTMLElement>(".intro-recovery")!,
          caption = overlay.querySelector<HTMLElement>(".intro-caption")!;
        video.muted = settings.muted;
        video.volume = Math.max(0, Math.min(1, settings.volume));
        video.poster = JAIL_INTRO_POSTER;
        video.src = JAIL_INTRO_VIDEO;
        let done = false;
        function finish(aborted = false) {
          if (done) return;
          done = true;
          clearTimeout(timer);
          video.pause();
          video.removeAttribute("src");
          video.load();
          overlay.remove();
          cancel = undefined;
          resolve(aborted ? "aborted" : "finished");
        }
        function recover(text: string) {
          recovery.hidden = false;
          recovery.querySelector("p")!.textContent = text;
        }
        function play() {
          recovery.hidden = true;
          void video
            .play()
            .catch(() =>
              recover("Tap Play to watch, or continue when you’re ready."),
            );
        }
        const timer = setTimeout(() => {
          if (video.readyState < 2)
            recover(
              "The intro is still loading. You can continue without waiting.",
            );
        }, 10000);
        video.addEventListener("ended", () => finish());
        video.addEventListener("error", () =>
          recover("The intro could not load. You can still enter the city."),
        );
        video.addEventListener("timeupdate", () => {
          caption.classList.toggle(
            "intro-caption-hidden",
            video.currentTime > 4,
          );
        });
        skip.onclick = () => finish();
        overlay.querySelector<HTMLButtonElement>(".intro-continue")!.onclick =
          () => finish();
        overlay.querySelector<HTMLButtonElement>(".intro-play")!.onclick = play;
        overlay.addEventListener("keydown", (event) => {
          event.stopPropagation();
          if (event.key === "Escape") {
            event.preventDefault();
            finish();
          }
          if (event.key === "Tab") {
            const buttons = [
                ...overlay.querySelectorAll<HTMLButtonElement>("button"),
              ].filter((b) => !b.closest("[hidden]")),
              first = buttons[0],
              last = buttons.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        });
        document.body.append(overlay);
        cancel = () => finish(true);
        skip.focus();
        if (matchMedia("(prefers-reduced-motion: reduce)").matches)
          recover(
            "Your release from jail is ready. Play the intro or continue.",
          );
        else play();
      });
    },
  };
}
