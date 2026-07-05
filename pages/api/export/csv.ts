import type { NextApiRequest, NextApiResponse } from 'next'
import type { Repository } from '@/types/github'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { user, repos } = req.body

    if (!user || !repos) {
      return res.status(400).json({ error: 'Missing profile parameters' })
    }

    const headers = ['Repository Name', 'Language', 'Stars', 'Forks', 'Open Issues', 'Created At', 'URL']
    const rows = (repos as Repository[]).map((repo) => [
      `"${repo.name.replace(/"/g, '""')}"`,
      `"${(repo.language || 'N/A').replace(/"/g, '""')}"`,
      repo.stargazers_count || 0,
      repo.forks_count || 0,
      repo.open_issues_count || 0,
      repo.updated_at || '',
      `"${repo.html_url || ''}"`,
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=${user.login}-repositories.csv`)
    return res.status(200).send(csvContent)
  } catch {
    return res.status(500).json({ error: 'Failed to generate CSV export' })
  }
}
