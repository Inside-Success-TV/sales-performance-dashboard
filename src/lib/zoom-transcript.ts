type RecordingData = {
  meetingId?: string;
  fileId?: string;
  isFromShare?: boolean;
};

export type ZoomTranscriptResult = {
  transcriptText: string;
  transcriptUrl: string | null;
  fileId: string | null;
};

const DEFAULT_ZOOM_ORIGIN = "https://us06web.zoom.us";

export async function resolveZoomTranscript(zoomLink: string): Promise<ZoomTranscriptResult | null> {
  const { origin, host } = getZoomOrigin(zoomLink);
  const firstPage = normalizeZoomHtml(
    await fetchText(zoomLink, zoomLink, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
  );

  let transcriptUrl = pickTranscriptUrl(firstPage, origin);
  let recordingData = parseRecordingData(firstPage);

  if (!transcriptUrl && recordingData.isFromShare && recordingData.meetingId) {
    const shareInfoUrl = `${origin}/nws/recording/1.0/guest/play/share-info/${encodeURIComponent(
      recordingData.meetingId,
    )}?originDomain=${encodeURIComponent(host)}`;
    const shareInfo = await fetchJson(shareInfoUrl, zoomLink);
    const redirectUrl = readNestedString(shareInfo, ["result", "redirectUrl"]);

    if (redirectUrl) {
      const playUrl = absoluteUrl(redirectUrl, origin);
      const playPage = normalizeZoomHtml(
        await fetchText(playUrl, zoomLink, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"),
      );
      recordingData = { ...recordingData, ...parseRecordingData(playPage) };
      transcriptUrl = pickTranscriptUrl(playPage, origin);
    }
  }

  if (!transcriptUrl && recordingData.fileId) {
    const playInfoUrl = `${origin}/nws/recording/1.0/guest/play/info/${encodeURIComponent(
      recordingData.fileId,
    )}?originDomain=${encodeURIComponent(host)}`;
    const playInfo = await fetchJson(playInfoUrl, zoomLink);
    transcriptUrl = absoluteUrl(
      readNestedString(playInfo, ["result", "transcriptUrl"]) ||
        readNestedString(playInfo, ["result", "ccUrl"]),
      origin,
    );
  }

  if (!transcriptUrl) return null;

  const rawTranscript = await fetchText(transcriptUrl, zoomLink, "text/vtt,text/plain,*/*");
  const transcriptText = cleanZoomTranscript(rawTranscript);

  if (transcriptText.length < 80) return null;

  return {
    transcriptText,
    transcriptUrl,
    fileId: recordingData.fileId || null,
  };
}

function getZoomOrigin(url: string) {
  try {
    const parsed = new URL(url);
    return { origin: parsed.origin, host: parsed.host };
  } catch {
    return { origin: DEFAULT_ZOOM_ORIGIN, host: "us06web.zoom.us" };
  }
}

async function fetchText(url: string, referer: string, accept: string) {
  const response = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      accept,
      referer,
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(20000),
  });

  const text = await response.text();
  if (!response.ok && !text) {
    throw new Error(`Zoom request failed with HTTP ${response.status}`);
  }
  return text;
}

async function fetchJson(url: string, referer: string): Promise<unknown> {
  const text = await fetchText(url, referer, "application/json, text/plain, */*");
  return JSON.parse(text);
}

function normalizeZoomHtml(html: string) {
  return html.replace(/\\u002F/g, "/").replace(/\\\//g, "/").replace(/&amp;/g, "&");
}

function parseRecordingData(html: string): RecordingData {
  const data: RecordingData = {};
  const block = html.match(/window\.recordingMobilePlayData\s*=\s*\{([\s\S]*?)\};/);
  const body = block ? block[1] : html;

  for (const key of ["meetingId", "fileId"] as const) {
    const match = body.match(new RegExp(`${key}\\s*:\\s*['"]([^'"]*)['"]`));
    if (match?.[1]) data[key] = match[1];
  }

  const shareMatch = body.match(/isFromShare\s*:\s*(true|false)/);
  if (shareMatch) data.isFromShare = shareMatch[1] === "true";

  return data;
}

function pickTranscriptUrl(raw: string, origin: string) {
  const patterns = [
    /https?:\/\/[^"'<>\s]+\.(?:vtt|txt)(?:\?[^"'<>\s]*)?/i,
    /"(?:transcriptUrl|transcript_url|downloadUrl|download_url|ccUrl)"\s*:\s*"([^"]+)"/i,
    /'(?:transcriptUrl|transcript_url|downloadUrl|download_url|ccUrl)'\s*:\s*'([^']+)'/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match) return absoluteUrl((match[1] || match[0]).replace(/\\/g, "").trim(), origin);
  }

  return "";
}

function absoluteUrl(url: string, origin: string) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

function readNestedString(value: unknown, path: string[]) {
  let current = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || !(key in current)) return "";
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === "string" ? current : "";
}

function cleanZoomTranscript(raw: string) {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/^WEBVTT.*$/gim, "")
    .replace(/^Kind:.*$/gim, "")
    .replace(/^Language:.*$/gim, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/^(?:\d{2}:)?\d{2}:\d{2}\.\d{3}\s+-->\s+(?:\d{2}:)?\d{2}:\d{2}\.\d{3}.*$/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
