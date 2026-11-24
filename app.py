"""Windows launcher for the existing LegalVault web application.

Python owns the local server and application lifecycle. Business screens and
record formats remain in web/LegalVault-Pro.html, intentionally unchanged.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import messagebox
from urllib.parse import urlsplit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = '1.0.0'
PORT = 8080
URL = f'http://localhost:{PORT}/LegalVault-Pro.html'


def asset_path() -> Path:
    return Path(__file__).resolve().parent / 'web' / 'LegalVault-Pro.html'


def data_path() -> Path:
    return Path(os.environ.get('LOCALAPPDATA', str(Path.home()))) / 'LegalVaultPro'


def find_browser() -> Path | None:
    roots = [Path(os.environ.get(k, 'C:/')) for k in
             ('PROGRAMFILES(X86)', 'PROGRAMFILES', 'LOCALAPPDATA')]
    relatives = ('Microsoft/Edge/Application/msedge.exe',
                 'Google/Chrome/Application/chrome.exe',
                 'BraveSoftware/Brave-Browser/Application/brave.exe')
    return next((base / rel for rel in relatives for base in roots
                 if (base / rel).is_file()), None)


def response_for(path: str, host: str, html: bytes) -> tuple[int, str, bytes]:
    # No directory listing, arbitrary file reads, API secrets, or network bind.
    if host not in {f'localhost:{PORT}', f'127.0.0.1:{PORT}'}:
        return 403, 'text/plain; charset=utf-8', b'Invalid Host'
    path = urlsplit(path).path
    if path in ('/', '/LegalVault-Pro.html'):
        return 200, 'text/html; charset=utf-8', html
    if path == '/health':
        return 200, 'application/json', json.dumps({
            'application': 'LegalVaultPro', 'version': VERSION}).encode()
    if path == '/favicon.ico':
        return 204, 'image/x-icon', b''
    return 404, 'text/plain; charset=utf-8', b'Not found'


class LocalServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = False

    def server_bind(self):
        # Avoid HTTPServer.getfqdn(): offline DNS can delay desktop startup.
        if hasattr(socket, 'SO_EXCLUSIVEADDRUSE'):
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        self.socket.bind(self.server_address)
        self.server_address = self.socket.getsockname()
        self.server_name, self.server_port = self.server_address


def make_handler(html: bytes):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.respond(False)

        def do_HEAD(self):
            self.respond(True)

        def respond(self, head_only: bool):
            status, mime, payload = response_for(
                self.path, self.headers.get('Host', ''), html)
            self.send_response(status)
            self.send_header('Content-Type', mime)
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
            self.end_headers()
            if not head_only:
                self.wfile.write(payload)

        def log_message(self, *_args):
            pass  # Do not persist personal URLs or record information in logs.

    return Handler


def self_test() -> dict:
    import tkinter as tk
    window = tk.Tk()
    window.withdraw()
    window.update()
    window.destroy()
    html = asset_path().read_bytes()
    assert b'<html' in html and b'const Backup =' in html
    assert response_for('/LegalVault-Pro.html', 'localhost:8080', html)[0] == 200
    assert response_for('/../../app.py', 'localhost:8080', html)[0] == 404
    assert response_for('/', 'untrusted.example:8080', html)[0] == 403
    return {'ok': True, 'gui_initialized': True, 'version': VERSION, 'asset_bytes': len(html),
            'asset_sha256': hashlib.sha256(html).hexdigest(),
            'frozen': bool(getattr(sys, 'frozen', False)),
            'browser_found': find_browser() is not None,
            'note': 'Resource and routing checks; no Google authorization or real-data restore performed.'}


def run_desktop() -> int:
    root = tk.Tk()
    root.withdraw()
    root.title('LegalVault Pro — تشغيل المنظومة')
    root.geometry('620x390')
    root.resizable(False, False)
    root.configure(bg='#0f172a')
    try:
        browser = find_browser()
        if browser is None:
            raise RuntimeError('يلزم تثبيت Microsoft Edge أو Google Chrome أو Brave لتشغيل الواجهة.')
        html = asset_path().read_bytes()
        profile = data_path() / 'BrowserData'
        profile.mkdir(parents=True, exist_ok=True)
        server = LocalServer(('127.0.0.1', PORT), make_handler(html))
    except OSError as exc:
        msg = ('المنفذ 8080 مستخدم. أغلق خادم Python القديم أو النسخة الأخرى من المنظومة ثم أعد التشغيل.'
               if getattr(exc, 'winerror', None) == 10048 else str(exc))
        messagebox.showerror('تعذر تشغيل المنظومة', msg, parent=root)
        root.destroy()
        return 1
    except Exception as exc:
        messagebox.showerror('تعذر تشغيل المنظومة', str(exc), parent=root)
        root.destroy()
        return 1

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    def open_app():
        try:
            # A real installed browser supports Google OAuth. A private profile
            # isolates this application's persistent storage from casual browsing.
            subprocess.Popen([str(browser), f'--app={URL}',
                              f'--user-data-dir={profile}', '--no-first-run'],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except OSError as exc:
            messagebox.showerror('تعذر فتح الواجهة', str(exc), parent=root)

    def close():
        if messagebox.askyesno('إيقاف المنظومة',
                               'احفظ العمل وأغلق نافذة المنظومة أولاً. هل تريد إيقاف الخادم؟', parent=root):
            server.shutdown()
            server.server_close()
            root.destroy()

    root.deiconify()
    tk.Label(root, text='LegalVault Pro', bg='#0f172a', fg='#fbbf24',
             font=('Segoe UI', 24, 'bold')).pack(pady=(22, 8))
    tk.Label(root, text='التحقيقات والكفالات • الدعاوى والنزاهة • وحدة المتابعة',
             bg='#0f172a', fg='white', font=('Segoe UI', 12)).pack(pady=5)
    tk.Label(root, text='الخادم المحلي يعمل — اترك هذه النافذة مفتوحة أثناء العمل',
             bg='#0f172a', fg='#a7f3d0', font=('Segoe UI', 11)).pack(pady=9)
    for text, command in [('فتح المنظومة', open_app),
                          ('فتح مجلد بيانات التطبيق', lambda: os.startfile(data_path())),
                          ('إيقاف المنظومة', close)]:
        tk.Button(root, text=text, command=command, font=('Segoe UI', 12),
                  bg='#334155', fg='white', relief='flat', width=31).pack(pady=5)
    tk.Label(root, text='البيانات السابقة تُنقل عبر نسخة شاملة واستعادة من داخل المنظومة.',
             bg='#0f172a', fg='#cbd5e1', font=('Segoe UI', 10)).pack(pady=9)
    root.protocol('WM_DELETE_WINDOW', close)
    root.after(300, open_app)
    root.mainloop()
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='LegalVault Pro Windows launcher')
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.self_test:
        result = self_test()
        text = json.dumps(result, indent=2)
        if args.report:
            args.report.write_text(text, encoding='utf-8')
        if sys.stdout is not None:
            print(text)
        return 0
    return run_desktop()


if __name__ == '__main__':
    raise SystemExit(main())
