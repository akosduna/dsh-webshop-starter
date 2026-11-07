'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Auto-submits a hidden POST form to Teya's hosted payment page. Teya has no
 * client SDK: the integration is "POST a signed form". A manual button shows
 * up after 5 s in case the automatic submit is blocked.
 */
export function TeyaRedirectForm({ actionUrl, fields }: { actionUrl: string; fields: Record<string, string> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    // Not cancelled on cleanup: submittedRef already prevents a double submit
    // when Strict Mode re-runs the effect.
    window.setTimeout(() => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      formRef.current?.submit();
    }, 100);

    const manualTimer = window.setTimeout(() => setShowManual(true), 5000);
    return () => window.clearTimeout(manualTimer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="max-w-sm text-muted-foreground">Preusmjeravamo vas na sigurnu Teya stranicu za plaćanje…</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Plaćanje karticom obrađuje Teya. Podaci o kartici ne prolaze kroz našu trgovinu.
      </p>

      {showManual && (
        <div className="mt-2 flex flex-col items-center gap-2">
          <p className="text-sm">Ako se preusmjeravanje ne dogodi automatski, kliknite gumb ispod.</p>
          <Button type="button" onClick={() => formRef.current?.submit()}>
            Nastavi na plaćanje
          </Button>
        </div>
      )}

      <form ref={formRef} action={actionUrl} method="POST" acceptCharset="UTF-8" className="hidden">
        {Object.entries(fields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} readOnly />
        ))}
      </form>
    </div>
  );
}
