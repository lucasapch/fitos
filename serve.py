#!/usr/bin/env python3
"""Dev server for local preview (avoids os.getcwd in sandboxed launchers)."""
import http.server, functools, os, sys

DIR = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8734

class DevHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.webmanifest': 'application/manifest+json', '.js': 'text/javascript'}

    def end_headers(self):
        # dev: sempre revalidar, senão o Chrome cacheia módulos por heurística
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

Handler = functools.partial(DevHandler, directory=DIR)

with http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler) as httpd:
    print(f'serving {DIR} at http://127.0.0.1:{PORT}')
    httpd.serve_forever()
