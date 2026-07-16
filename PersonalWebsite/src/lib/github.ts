import { Octokit } from '@octokit/rest';
import { getSecret } from 'astro:env/server';

// The Astro app lives in a nested subfolder of the repo, so content files are
// committed under this prefix. This is the load-bearing path constant.
export const CONTENT_ROOT = 'PersonalWebsite/src/content';

export type Collection = 'writing' | 'projects' | 'pages';

interface RepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

function repoInfo(): RepoInfo {
  const full = getSecret('GITHUB_REPO');
  if (!full) throw new Error('GITHUB_REPO is not set');
  const [owner, repo] = full.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPO must be "owner/name"');
  const branch = getSecret('GITHUB_BRANCH') || 'main';
  return { owner, repo, branch };
}

export interface EntryFile {
  name: string;
  path: string;
  sha: string;
}

export function createGitHub(token: string) {
  const octokit = new Octokit({ auth: token });
  const { owner, repo, branch } = repoInfo();

  async function listEntries(collection: Collection): Promise<EntryFile[]> {
    const path = `${CONTENT_ROOT}/${collection}`;
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
      if (!Array.isArray(data)) return [];
      return data
        .filter((f) => f.type === 'file' && /\.(md|mdx)$/.test(f.name))
        .map((f) => ({ name: f.name, path: f.path, sha: f.sha }));
    } catch (e: any) {
      if (e?.status === 404) return [];
      throw e;
    }
  }

  async function readEntry(
    collection: Collection,
    filename: string
  ): Promise<{ content: string; sha: string }> {
    const path = `${CONTENT_ROOT}/${collection}/${filename}`;
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(data) || data.type !== 'file') throw new Error('Not a file');
    const content = Buffer.from(data.content, 'base64').toString('utf8');
    return { content, sha: data.sha };
  }

  async function saveEntry(opts: {
    collection: Collection;
    filename: string;
    body: string;
    sha?: string;
    message?: string;
  }) {
    const path = `${CONTENT_ROOT}/${opts.collection}/${opts.filename}`;
    const content = Buffer.from(opts.body, 'utf8').toString('base64');
    const res = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message: opts.message ?? `Update ${path}`,
      content,
      branch,
      ...(opts.sha ? { sha: opts.sha } : {}),
    });
    return res.data;
  }

  async function deleteEntry(
    collection: Collection,
    filename: string,
    sha: string,
    message?: string
  ) {
    const path = `${CONTENT_ROOT}/${collection}/${filename}`;
    await octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message: message ?? `Delete ${path}`,
      sha,
      branch,
    });
  }

  return { listEntries, readEntry, saveEntry, deleteEntry, owner, repo, branch };
}
