import {
  setDeferredPrompt,
  getDeferredPrompt,
  triggerInstall,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa";

function mockPrompt(
  outcome: "accepted" | "dismissed",
): BeforeInstallPromptEvent {
  return {
    prompt: jest.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  } as unknown as BeforeInstallPromptEvent;
}

afterEach(() => {
  // Reset the module-level deferred prompt between tests.
  setDeferredPrompt(null);
});

describe("deferred prompt lifecycle", () => {
  it("stores and returns the deferred prompt; null clears it", () => {
    const prompt = mockPrompt("accepted");
    setDeferredPrompt(prompt);
    expect(getDeferredPrompt()).toBe(prompt);
    setDeferredPrompt(null);
    expect(getDeferredPrompt()).toBeNull();
  });
});

describe("triggerInstall", () => {
  it("returns null when there is no deferred prompt", async () => {
    setDeferredPrompt(null);
    await expect(triggerInstall()).resolves.toBeNull();
  });

  it("returns 'accepted' and clears the prompt when the user accepts", async () => {
    const prompt = mockPrompt("accepted");
    setDeferredPrompt(prompt);
    await expect(triggerInstall()).resolves.toBe("accepted");
    expect(prompt.prompt).toHaveBeenCalledTimes(1);
    // Prompt is cleared so it cannot be triggered twice.
    expect(getDeferredPrompt()).toBeNull();
    await expect(triggerInstall()).resolves.toBeNull();
  });

  it("returns 'dismissed' when the user dismisses", async () => {
    setDeferredPrompt(mockPrompt("dismissed"));
    await expect(triggerInstall()).resolves.toBe("dismissed");
  });
});
