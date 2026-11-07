'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PickupPointSummary } from '@/components/checkout/pickup-point-summary';
import type { PickupPoint } from '@/db/enums';

type LockerSelection = {
  boxnowLockerId?: string;
  boxnowLockerName?: string;
  boxnowLockerAddressLine1?: string;
  boxnowLockerAddressLine2?: string;
  boxnowLockerPostalCode?: string;
  boxnowLockerCity?: string;
  boxnowCountry?: string;
  name?: string;
  id?: string;
};

const ALLOWED_ORIGINS = [
  'https://widget.boxnow.hr',
  'https://widget-v5.boxnow.hr',
  'https://widget-v4.boxnow.hr',
  'https://widget-v3.boxnow.hr',
];

function asLocker(data: unknown): PickupPoint | null {
  if (!data || typeof data !== 'object') return null;
  const selected = data as LockerSelection;
  const id = selected.boxnowLockerId || selected.id;
  if (!id) return null;
  const city = selected.boxnowLockerCity || selected.boxnowLockerAddressLine2;
  return {
    id: String(id),
    name: selected.boxnowLockerName || selected.name || String(id),
    contact: {
      address: selected.boxnowLockerAddressLine1,
      postalCode: selected.boxnowLockerPostalCode,
      city,
      countryCode: selected.boxnowCountry || 'HR',
    },
  };
}

/**
 * Official BOX NOW map (https://www.boxnow.hr/diy/widget/developers): opens
 * their popup in a full-screen iframe and reads the locker the customer picks.
 */
export function BoxNowLockerPicker({
  partnerId,
  value,
  onChange,
}: {
  partnerId: string;
  value: PickupPoint | null;
  onChange: (point: PickupPoint) => void;
}) {
  const [open, setOpen] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const openMap = () => {
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      partnerId,
      gps: 'yes',
      autoselect: 'yes',
      autoclose: 'yes',
      language: 'hr',
      countryCode: 'hr',
    });
    iframe.src = `https://widget-v5.boxnow.hr/popup.html?${params.toString()}`;
    iframe.allow = 'geolocation';
    iframe.title = 'BOX NOW paketomati';
    iframe.style.cssText = 'border:0;width:100%;height:100%;position:fixed;inset:0;z-index:80;background:#fff;';
    document.body.appendChild(iframe);
    setOpen(true);

    const close = () => {
      iframe.remove();
      window.removeEventListener('message', onMessage);
      cleanupRef.current = null;
      setOpen(false);
    };

    const onMessage = (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;
      const locker = asLocker(event.data);
      close();
      if (locker) onChange(locker);
    };

    window.addEventListener('message', onMessage);
    cleanupRef.current = close;
  };

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" className="w-full" onClick={openMap}>
        {open ? 'Karta je otvorena…' : value ? 'Promijeni BOX NOW paketomat' : 'Odaberi BOX NOW paketomat'}
      </Button>
      {value && <PickupPointSummary point={value} />}
    </div>
  );
}
