/**
 * @jest-environment jsdom
 */
import {
  getShareUrl,
  getShareText,
  shareViaTwitter,
  shareViaLinkedIn,
  shareViaWhatsApp,
  copyProfileLink,
} from "@/lib/sharing";

describe("getShareUrl / getShareText", () => {
  it("builds a share URL from the current origin", () => {
    // jsdom default origin is http://localhost
    expect(getShareUrl("octocat")).toBe(`${window.location.origin}/octocat`);
  });

  it("builds share text using the display name when provided", () => {
    expect(getShareText("octocat", "The Octocat")).toContain("The Octocat");
    expect(getShareText("octocat")).toContain("octocat");
  });
});

describe("shareVia* open the correct, URL-encoded intent", () => {
  let openSpy: jest.SpyInstance;

  beforeEach(() => {
    openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
  });
  afterEach(() => {
    openSpy.mockRestore();
  });

  it("Twitter intent contains the encoded profile URL", () => {
    shareViaTwitter("octocat", "The Octocat");
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("https://twitter.com/intent/tweet");
    expect(url).toContain(encodeURIComponent(getShareUrl("octocat")));
  });

  it("LinkedIn intent contains the encoded profile URL", () => {
    shareViaLinkedIn("octocat");
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("linkedin.com/sharing/share-offsite");
    expect(url).toContain(encodeURIComponent(getShareUrl("octocat")));
  });

  it("WhatsApp intent contains the encoded text + URL", () => {
    shareViaWhatsApp("octocat", "The Octocat");
    const url = openSpy.mock.calls[0][0] as string;
    expect(url).toContain("wa.me");
    expect(url).toContain(encodeURIComponent(getShareUrl("octocat")));
  });
});

describe("copyProfileLink", () => {
  it("resolves true when the clipboard write succeeds", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
    });
    await expect(copyProfileLink("octocat")).resolves.toBe(true);
  });

  it("resolves false when the clipboard write rejects", async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockRejectedValue(new Error("denied")),
      },
    });
    await expect(copyProfileLink("octocat")).resolves.toBe(false);
  });
});
