export function glsTrackingUrl(parcelNumber: string): string {
  return `https://gls-group.com/HR/hr/pracenje-posiljke/?match=${encodeURIComponent(parcelNumber)}`;
}

export function boxNowTrackingUrl(parcelId: string): string {
  return `https://www.boxnow.hr/track?parcelId=${encodeURIComponent(parcelId)}`;
}

export function trackingUrlFor(provider: 'gls' | 'boxnow', trackingNumber: string): string {
  return provider === 'boxnow' ? boxNowTrackingUrl(trackingNumber) : glsTrackingUrl(trackingNumber);
}
