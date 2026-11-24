import unittest
from unittest.mock import patch
import app


class ApplicationTests(unittest.TestCase):
    def test_bundled_asset_and_all_departments(self):
        self.assertTrue(app.self_test()['ok'])
        content = app.asset_path().read_text(encoding='utf-8')
        for name in ('INVESTIGATIONS_HTML', 'LAWSUITS_HTML', 'FOLLOWUP_HTML'):
            self.assertIn('const ' + name, content)

    def test_only_expected_files_are_served(self):
        for path in ('/../app.py', '/.env', '/web/', '/BrowserData', '/%2e%2e/app.py'):
            self.assertEqual(app.response_for(path, 'localhost:8080', b'app')[0], 404)

    def test_host_validation(self):
        for host in ('evil.example', 'localhost:9000', 'localhost:8080.evil.example', ''):
            self.assertEqual(app.response_for('/', host, b'app')[0], 403)

    def test_html_routes_and_queries(self):
        for path in ('/', '/LegalVault-Pro.html', '/LegalVault-Pro.html?source=test'):
            self.assertEqual(app.response_for(path, 'localhost:8080', b'app'),
                             (200, 'text/html; charset=utf-8', b'app'))

    def test_user_data_separate_from_executable(self):
        with patch.dict('os.environ', {'LOCALAPPDATA': 'C:/Users/Test/AppData/Local'}):
            self.assertEqual(app.data_path().name, 'LegalVaultPro')
            self.assertNotEqual(app.data_path(), app.asset_path().parent)


if __name__ == '__main__':
    unittest.main()
