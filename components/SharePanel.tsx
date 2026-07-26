import { useState } from "react";
import {
  shareViaTwitter,
  shareViaLinkedIn,
  shareViaWhatsApp,
  copyProfileLink,
  shareNative,
  getShareUrl,
} from "@/lib/sharing";
import type { GitHubUser } from "@/types/github";

interface SharePanelProps {
  user: GitHubUser;
}

export default function SharePanel({ user }: SharePanelProps) {
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = async () => {
    const ok = await copyProfileLink(user.login);
    if (ok) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const btnClass =
    "flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors text-center";

  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="bg-white dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg p-6 mt-6">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
        Share Profile
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Share {user.name || user.login}&apos;s analyzed profile with others.
      </p>

      {/* Native share button (mobile) + copy link */}
      <div className="flex flex-wrap gap-2 mb-4">
        {canShare && (
          <button
            type="button"
            onClick={() => shareNative(user.login, user.name)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-600 hover:bg-gray-200 dark:hover:bg-slate-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          {linkCopied ? "✓ Copied!" : "Copy Link"}
        </button>
      </div>

      {/* Social buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => shareViaTwitter(user.login, user.name)}
          className={`${btnClass} bg-black hover:bg-gray-800 text-white border-black`}
        >
          Twitter
        </button>
        <button
          type="button"
          onClick={() => shareViaLinkedIn(user.login)}
          className={`${btnClass} bg-blue-700 hover:bg-blue-800 text-white border-blue-700`}
        >
          LinkedIn
        </button>
        <button
          type="button"
          onClick={() => shareViaWhatsApp(user.login, user.name)}
          className={`${btnClass} bg-green-600 hover:bg-green-700 text-white border-green-600`}
        >
          WhatsApp
        </button>
      </div>

      {/* Direct link */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          Profile URL:
        </p>
        <code className="block text-xs bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded px-3 py-2 text-blue-600 dark:text-blue-400 overflow-x-auto whitespace-nowrap">
          {getShareUrl(user.login)}
        </code>
      </div>
    </div>
  );
}
