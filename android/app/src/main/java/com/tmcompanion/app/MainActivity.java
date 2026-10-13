package com.tmcompanion.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KeepAlivePlugin.class);
        super.onCreate(savedInstanceState);
        // La web se dibuja detrás de las barras del sistema y se acomoda con env(safe-area-inset-*)
        EdgeToEdge.enable(this);
    }
}
