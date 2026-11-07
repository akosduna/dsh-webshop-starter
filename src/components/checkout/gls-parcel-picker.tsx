'use client';

import { createElement, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PickupPointSummary } from '@/components/checkout/pickup-point-summary';
import type { PickupPoint } from '@/db/enums';

type GlsDialogElement = HTMLElement & {
  showModal?: () => void;
};

const GLS_SCRIPT_ID = 'gls-dpm-widget';
const GLS_SCRIPT_SRC = 'https://map.gls-croatia.com/widget/gls-dpm.js';
const GLS_ELEMENT = 'gls-dpm-dialog';
const LOAD_TIMEOUT_MS = 20000;

let glsWidgetPromise: Promise<void> | null = null;

/** Loads the GLS widget once per page; resolves when <gls-dpm-dialog> is defined. */
function loadGlsWidget(): Promise<void> {
  if (window.customElements.get(GLS_ELEMENT)) return Promise.resolve();
  if (glsWidgetPromise) return glsWidgetPromise;

  glsWidgetPromise = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS);
    window.customElements.whenDefined(GLS_ELEMENT).then(() => {
      window.clearTimeout(timeout);
      resolve();
    });

    let script = document.getElementById(GLS_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = GLS_SCRIPT_ID;
      script.src = GLS_SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('error', () => {
      window.clearTimeout(timeout);
      reject(new Error('script error'));
    });
  }).catch((error) => {
    glsWidgetPromise = null;
    document.getElementById(GLS_SCRIPT_ID)?.remove();
    throw error;
  });

  return glsWidgetPromise;
}

/**
 * Official GLS Croatia map. The dialog fires a `change` event with the
 * selected ParcelShop or parcel locker (id, name, contact).
 */
export function GlsParcelPicker({
  value,
  onChange,
}: {
  value: PickupPoint | null;
  onChange: (point: PickupPoint) => void;
}) {
  const [dialog, setDialog] = useState<GlsDialogElement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    loadGlsWidget()
      .then(() => active && setState('ready'))
      .catch(() => active && setState('failed'));
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setState('loading');
    setAttempt((n) => n + 1);
  };

  useEffect(() => {
    if (!dialog) return;

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<PickupPoint>).detail;
      if (!detail?.id) return;
      onChange(detail);
    };

    dialog.addEventListener('change', handleChange);
    return () => dialog.removeEventListener('change', handleChange);
  }, [dialog, onChange]);

  return (
    <div className="space-y-3">
      {state === 'failed' ? (
        <div className="rounded-md bg-warning/15 px-3 py-3 text-sm">
          <p>Karta GLS paketomata se trenutno ne učitava. Pokušajte ponovno ili odaberite drugi način dostave.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={retry}>
            Pokušaj ponovno
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={state !== 'ready'}
          onClick={() => dialog?.showModal?.()}
        >
          {state === 'ready'
            ? value
              ? 'Promijeni paketomat ili ParcelShop'
              : 'Odaberi paketomat ili ParcelShop'
            : 'Učitavanje karte…'}
        </Button>
      )}
      {value && <PickupPointSummary point={value} />}
      {state === 'ready' &&
        createElement(GLS_ELEMENT, {
          ref: setDialog,
          country: 'hr',
          language: 'hr',
        } as Record<string, unknown>)}
    </div>
  );
}
