"use client";

import { useEffect } from "react";

/** Keep phone sheets and Charlie above the keyboard. Desktop widths clear any inline frame. */
export function PhoneViewport() {
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const viewport = window.visualViewport;

    function place(el: HTMLElement, reserveBottom: number) {
      if (!mq.matches || !viewport) {
        el.style.top = "";
        el.style.height = "";
        el.style.bottom = "";
        return;
      }
      const keyboardOpen = window.innerHeight - viewport.height > 120;
      const reserve = keyboardOpen ? 0 : reserveBottom;
      el.style.top = `${viewport.offsetTop}px`;
      el.style.height = `${Math.max(0, viewport.height - reserve)}px`;
      el.style.bottom = "auto";
    }

    function sync() {
      document.querySelectorAll<HTMLElement>(".phone-sheet").forEach((el) => place(el, 0));
      document.querySelectorAll<HTMLElement>(".phone-chat").forEach((el) => place(el, 80));
    }

    sync();
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const nodes = [...mutation.addedNodes, ...mutation.removedNodes];
        const touchesSheet = nodes.some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          return (
            node.classList.contains("phone-sheet") ||
            node.classList.contains("phone-chat") ||
            node.querySelector(".phone-sheet, .phone-chat") != null
          );
        });
        if (touchesSheet) {
          sync();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    mq.addEventListener("change", sync);
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    return () => {
      observer.disconnect();
      mq.removeEventListener("change", sync);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
    };
  }, []);

  return null;
}
