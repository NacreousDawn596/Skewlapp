let pollingPromise: Promise<void> | null = null;

export function runSinglePoll(
  fn: () => Promise<void>
): Promise<void> {
  if (pollingPromise) {
    console.log("[PollingExecutor] Poll already running, reusing promise");
    return pollingPromise;
  }

  pollingPromise = (async () => {
    try {
      await fn();
    } finally {
      pollingPromise = null;
    }
  })();

  return pollingPromise;
}
