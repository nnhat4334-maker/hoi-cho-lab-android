package vn.hoicholab.offline;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintManager;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Offline Android container for HỘI CHỢ LAB.
 *
 * No INTERNET permission, no external dependencies, no server and no WebView file:// access.
 * App assets are served on a synthetic HTTPS origin, which keeps localStorage isolated and
 * persistent on this Android device. Export/import uses Android's Storage Access Framework.
 */
public final class MainActivity extends Activity {
    private static final String ORIGIN_HOST = "appassets.androidplatform.net";
    private static final String BASE_URL = "https://appassets.androidplatform.net/index.html";
    private static final int REQ_IMPORT = 501;
    private static final int REQ_EXPORT = 502;
    private static final int MAX_EXPORT_CHARS = 8_000_000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WebView webView;
    private ProgressBar loading;
    private ValueCallback<Uri[]> chooserCallback;
    private String pendingExport;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(36, 80, 68));
        getWindow().setNavigationBarColor(Color.rgb(248, 241, 227));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        }

        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(Color.rgb(248, 241, 227));
        webView = new WebView(this);
        container.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        loading = new ProgressBar(this);
        FrameLayout.LayoutParams indicator = new FrameLayout.LayoutParams(60, 60, Gravity.CENTER);
        container.addView(loading, indicator);
        setContentView(container);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // Required by the trusted, packaged application.
        settings.setDomStorageEnabled(true); // Persist app state / orders locally.
        settings.setAllowFileAccess(false); // Assets are served by HTTPS interception, not file://.
        settings.setAllowContentAccess(true); // Android picker grants selected JSON file access.
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);

        // Expose only save and print actions to the packaged origin; no network APIs.
        webView.addJavascriptInterface(new OfflineBridge(), "HCAndroid");
        webView.setWebViewClient(new OfflineWebViewClient());
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view,
                                             ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (chooserCallback != null) chooserCallback.onReceiveValue(null);
                chooserCallback = callback;
                Intent chooser = new Intent(Intent.ACTION_GET_CONTENT);
                chooser.addCategory(Intent.CATEGORY_OPENABLE);
                chooser.setType("application/json");
                try {
                    startActivityForResult(Intent.createChooser(chooser, "Chọn bản sao JSON"), REQ_IMPORT);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    chooserCallback = null;
                    callback.onReceiveValue(null);
                    toast("Không tìm thấy ứng dụng chọn tệp.");
                    return true;
                }
            }
        });

        webView.loadUrl(BASE_URL);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    /** All requests for app content are mapped to bundled assets. No outside URLs are served. */
    private final class OfflineWebViewClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            // Internal anchor routes and app assets stay within the offline app.
            return !("https".equals(u.getScheme()) && ORIGIN_HOST.equals(u.getHost()));
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri u = request.getUrl();
            if (!"https".equals(u.getScheme()) || !ORIGIN_HOST.equals(u.getHost())) {
                // No external network traffic. No INTERNET permission is requested.
                return unavailable();
            }
            String path = u.getPath();
            if (path == null || "/".equals(path)) path = "/index.html";
            // Allow exactly the files shipped with the app (no traversal or arbitrary paths).
            String file;
            switch (path) {
                case "/index.html": file = "index.html"; break;
                case "/assets/app.js": file = "assets/app.js"; break;
                case "/assets/engine.js": file = "assets/engine.js"; break;
                case "/assets/styles.css": file = "assets/styles.css"; break;
                default: return unavailable();
            }
            String mime = path.endsWith(".html") ? "text/html" :
                    path.endsWith(".css") ? "text/css" : "application/javascript";
            try {
                InputStream stream = getAssets().open("web/" + file);
                return new WebResourceResponse(mime, "UTF-8", stream);
            } catch (IOException e) {
                return unavailable();
            }
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            loading.setVisibility(View.GONE);
        }
    }

    private WebResourceResponse unavailable() {
        WebResourceResponse response = new WebResourceResponse("text/plain", "UTF-8",
                new ByteArrayInputStream(new byte[0]));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            response.setStatusCodeAndReasonPhrase(404, "Not Found");
        }
        return response;
    }

    /** Only packaged HTML calls these annotated methods. All UI work runs on main thread. */
    public final class OfflineBridge {
        @JavascriptInterface
        public void saveText(final String requestedName, final String mime, final String content) {
            if (content == null || content.length() > MAX_EXPORT_CHARS) {
                mainHandler.post(() -> toast("Bản xuất quá lớn hoặc không hợp lệ."));
                return;
            }
            mainHandler.post(() -> {
                if (pendingExport != null) {
                    toast("Hãy hoàn tất thao tác lưu tệp đang mở.");
                    return;
                }
                pendingExport = content;
                String safeName = requestedName == null ? "hoi-cho-lab.json" :
                        requestedName.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (safeName.isEmpty()) safeName = "hoi-cho-lab.json";
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/csv".equals(mime) ? "text/csv" : "application/json");
                intent.putExtra(Intent.EXTRA_TITLE, safeName);
                try {
                    startActivityForResult(intent, REQ_EXPORT);
                } catch (ActivityNotFoundException e) {
                    pendingExport = null;
                    toast("Không mở được trình lưu tệp.");
                }
            });
        }

        @JavascriptInterface
        public void printPage() {
            mainHandler.post(() -> {
                if (webView == null) return;
                PrintManager manager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                if (manager == null) {
                    toast("Điện thoại không hỗ trợ in / lưu PDF.");
                    return;
                }
                manager.print("Hoi Cho Lab - Bao cao", webView.createPrintDocumentAdapter("Hoi Cho Lab"), null);
            });
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_IMPORT) {
            ValueCallback<Uri[]> callback = chooserCallback;
            chooserCallback = null;
            if (callback != null) {
                Uri uri = resultCode == RESULT_OK && data != null ? data.getData() : null;
                callback.onReceiveValue(uri == null ? null : new Uri[]{uri});
            }
        } else if (requestCode == REQ_EXPORT) {
            String contents = pendingExport;
            pendingExport = null;
            if (resultCode != RESULT_OK || data == null || data.getData() == null || contents == null) return;
            try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                if (out == null) throw new IOException("Không mở được tệp đích.");
                out.write(contents.getBytes(StandardCharsets.UTF_8));
                out.flush();
                toast("Đã lưu tệp thành công.");
            } catch (Exception e) {
                toast("Lỗi lưu tệp: " + e.getMessage());
            }
        }
    }

    private void toast(String text) { Toast.makeText(this, text, Toast.LENGTH_LONG).show(); }

    @Override
    public void onBackPressed() {
        // On Android 13+ this is dispatched by OnBackInvokedCallback registered above.
        handleBack();
    }

    private void handleBack() {
        if (webView == null) {
            moveTaskToBack(true);
            return;
        }
        final String js = "(function(){"
                + "var dialog=document.getElementById('confirmBackdrop');"
                + "if(dialog&&!dialog.hidden){document.getElementById('confirmCancel').click();return 'handled';}"
                + "var sidebar=document.getElementById('sidebar');"
                + "if(sidebar&&sidebar.classList.contains('open')){document.getElementById('menuToggle').click();return 'handled';}"
                + "var current=document.querySelector('.page.active');"
                + "if(current&&current.id!=='page-dashboard'){document.querySelector('[data-page=dashboard]').click();return 'handled';}"
                + "return 'root';})()";
        webView.evaluateJavascript(js, result -> {
            if ("\"root\"".equals(result) || "null".equals(result)) moveTaskToBack(true);
        });
    }

    @Override
    protected void onDestroy() {
        if (chooserCallback != null) {
            chooserCallback.onReceiveValue(null);
            chooserCallback = null;
        }
        if (webView != null) {
            ((ViewGroup) webView.getParent()).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
