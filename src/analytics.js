export function trackPageView(path) {
  if (window.gtag) {
    window.gtag('config', 'G-TBJ2QZ4FV0', {
      page_path: path
    });
  }
} 