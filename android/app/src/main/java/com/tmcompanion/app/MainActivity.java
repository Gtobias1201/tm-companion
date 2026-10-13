package com.tmcompanion.app;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KeepAlivePlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        // La web se dibuja detrás de las barras del sistema y se acomoda con env(safe-area-inset-*)
        EdgeToEdge.enable(this);
        // Que Android no mate el proceso de la página cuando la app no se ve
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getBridge().getWebView().setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, false);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepPageRunningIfPlaying();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepPageRunningIfPlaying();
    }

    /**
     * Al pasar a segundo plano Chromium marca la página como oculta y frena sus relojes: el latido
     * de PeerJS deja de salir y al minuto el servidor da al anfitrión por desconectado. Mientras hay
     * una partida online (servicio prendido) le avisamos a la WebView que sigue visible.
     */
    private void keepPageRunningIfPlaying() {
        if (!KeepAliveService.isRunning() || getBridge() == null) return;
        WebView webView = getBridge().getWebView();
        // Después de que Android termine de ocultar la ventana, si no lo pisa
        webView.postDelayed(
            () -> {
                if (!KeepAliveService.isRunning()) return;
                webView.dispatchWindowVisibilityChanged(View.VISIBLE);
                webView.onResume();
                webView.resumeTimers();
            },
            500
        );
    }
}
