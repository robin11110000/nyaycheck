export function redact(s: string): string {
  return s
    .replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '[AADHAAR REDACTED]')
    .replace(/\b[A-Z]{5}\d{4}[A-Z]\b/gi, '[PAN REDACTED]');
}
