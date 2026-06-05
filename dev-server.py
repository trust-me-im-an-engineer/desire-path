#!/usr/bin/env python3
import argparse
import html
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

WATCH_EXTENSIONS = {
    ".html",
    ".css",
    ".js",
    ".json",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".svg",
}

RELOAD_SNIPPET = """
<script type="module">
  const events = new EventSource('/__reload');
  events.addEventListener('reload', () => location.reload());
</script>
"""

ROOT = Path.cwd()


def latest_mtime():
    latest = 0.0
    for path in ROOT.rglob('*'):
        if not path.is_file():
            continue
        if '.git' in path.parts or '__pycache__' in path.parts:
            continue
        if path.name == 'dev-server.py' or path.suffix.lower() in WATCH_EXTENSIONS:
            try:
                latest = max(latest, path.stat().st_mtime)
            except OSError:
                pass
    return latest


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")

    def do_GET(self):
        if self.path == '/__reload':
            self.handle_reload_stream()
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()

    def send_head(self):
        path = Path(self.translate_path(self.path))
        if path.is_dir():
            path = path / 'index.html'
        if path.suffix.lower() != '.html' or not path.exists():
            return super().send_head()

        try:
            content = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            return super().send_head()

        if '</body>' in content:
            content = content.replace('</body>', f'{RELOAD_SNIPPET}\n</body>')
        else:
            content += RELOAD_SNIPPET

        data = content.encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        return _BytesReader(data)

    def handle_reload_stream(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'keep-alive')
        self.end_headers()

        last = latest_mtime()
        try:
            while True:
                current = latest_mtime()
                if current > last:
                    last = current
                    self.wfile.write(b'event: reload\ndata: changed\n\n')
                    self.wfile.flush()
                else:
                    self.wfile.write(b'event: ping\ndata: ok\n\n')
                    self.wfile.flush()
                time.sleep(0.5)
        except (BrokenPipeError, ConnectionResetError):
            return


class _BytesReader:
    def __init__(self, data):
        self.data = data
        self.offset = 0

    def read(self, size=-1):
        if size == -1:
            size = len(self.data) - self.offset
        chunk = self.data[self.offset:self.offset + size]
        self.offset += len(chunk)
        return chunk

    def close(self):
        pass


def main():
    parser = argparse.ArgumentParser(description='Static dev server with browser auto reload.')
    parser.add_argument('--host', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8002)
    args = parser.parse_args()

    os.chdir(ROOT)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f'Serving {html.escape(str(ROOT))}')
    print(f'Hot reload: http://127.0.0.1:{args.port}/')
    server.serve_forever()


if __name__ == '__main__':
    main()
