'use client';

export function VideoPlayer({ url }: { url: string }) {
  if (!url) return null;

  // Google Drive
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (driveMatch) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://drive.google.com/file/d/${driveMatch[1]}/preview`}
          allow="autoplay"
          allowFullScreen
        />
      </div>
    );
  }

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (ytMatch) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${ytMatch[1]}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) {
    return <video src={url} controls className="w-full rounded-xl bg-black" />;
  }

  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 hover:bg-blue-100 transition-colors">
      <span className="text-xl">📹</span>
      <span className="text-sm font-medium flex-1">เปิดดูวิดีโอ</span>
      <span className="text-xs text-blue-400">→</span>
    </a>
  );
}
