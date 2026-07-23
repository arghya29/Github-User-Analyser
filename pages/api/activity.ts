import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import type { ActivityEvent } from "@/types/github";
import { env } from "@/lib/env";
import { logError } from "@/lib/errorLogger";

interface ErrorResponse {
  error: string;
  errorType: "not_found" | "rate_limited" | "unknown";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActivityEvent[] | ErrorResponse>,
) {
  const { username } = req.query;

  if (!username || typeof username !== "string") {
    return res
      .status(400)
      .json({ error: "Missing username parameter", errorType: "unknown" });
  }

  const token = env.GITHUB_TOKEN;

  try {
    const response = await axios.get(
      `https://api.github.com/users/${encodeURIComponent(username)}/events/public`,
      {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          Accept: "application/vnd.github.v3+json",
        },
        params: { per_page: 30 },
        validateStatus: () => true,
      },
    );

    if (response.status === 404) {
      return res
        .status(404)
        .json({ error: "User not found", errorType: "not_found" });
    }
    if (response.status === 403) {
      return res
        .status(403)
        .json({ error: "Rate limited", errorType: "rate_limited" });
    }
    if (response.status !== 200) {
      return res
        .status(500)
        .json({ error: "Failed to fetch activity", errorType: "unknown" });
    }

    const events: ActivityEvent[] = response.data.map(
      (ev: Record<string, unknown>) => {
        const repo = ev.repo as { name: string; url: string };
        return {
          id: ev.id as string,
          type: ev.type as string,
          repo: repo?.name || "",
          repoUrl:
            repo?.url?.replace("api.github.com/repos", "github.com") || "",
          createdAt: ev.created_at as string,
          payload: JSON.stringify(ev.payload),
        };
      },
    );

    return res.status(200).json(events);
  } catch (error) {
    logError("api/activity", error, { username });
    return res
      .status(500)
      .json({ error: "Failed to fetch activity", errorType: "unknown" });
  }
}
