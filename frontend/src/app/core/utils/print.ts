

export const PRINT_AREA_CLASS = 'invoice-print-area';

export const NO_PRINT_CLASS = 'no-print';

export function printElement(selector: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const target = document.querySelector(selector);

  if (!target) {

    window.print();
    return;
  }

  document.body.classList.add('printing-element');
  target.classList.add('print-target');

  const cleanup = () => {
    document.body.classList.remove('printing-element');
    target.classList.remove('print-target');
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup);

  try {
    window.print();
  } finally {

    setTimeout(cleanup, 1000);
  }
}

export function printInvoice(): void {
  window.print();
}