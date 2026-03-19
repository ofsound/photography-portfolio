import { onNavigate } from '$app/navigation';

const isAdminPath = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');

export function createViewTransitions(
  isViewerRoute: (pathname: string) => boolean,
) {
  const clearTransitionMeta = () => {
    delete document.documentElement.dataset.vt;
    delete document.documentElement.dataset.vtDirection;
    delete document.documentElement.dataset.vtReduced;
  };

  onNavigate((navigation) => {
    const fromPath = navigation.from?.url.pathname ?? window.location.pathname;
    const toPath = navigation.to?.url.pathname ?? fromPath;

    if (isViewerRoute(fromPath) || isViewerRoute(toPath)) {
      return;
    }

    if (isAdminPath(fromPath) || isAdminPath(toPath)) {
      return;
    }

    if (!document.startViewTransition) {
      return;
    }

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    document.documentElement.dataset.vt = 'default';
    delete document.documentElement.dataset.vtDirection;
    if (reducedMotion) {
      document.documentElement.dataset.vtReduced = '1';
    } else {
      delete document.documentElement.dataset.vtReduced;
    }

    return new Promise<void>((resolve) => {
      const transition = document.startViewTransition(async () => {
        resolve();
        try {
          await navigation.complete;
        } catch {
          // Navigation cancelled — VT aborted automatically.
        }
      });

      transition.finished.finally(() => {
        clearTransitionMeta();
      });
    });
  });
}
