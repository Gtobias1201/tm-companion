package com.tmcompanion.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Puente con la web (src/platform/keepAlive.ts): prende y apaga el servicio y pide los permisos. */
@CapacitorPlugin(name = "KeepAlive", permissions = { @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS }) })
public class KeepAlivePlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        // Android 13+: sin permiso de notificaciones el servicio anda igual, pero el aviso no se ve
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") == PermissionState.PROMPT) {
            requestPermissionForAlias("notifications", call, "afterNotificationPermission");
            return;
        }
        startService(call);
    }

    @PermissionCallback
    private void afterNotificationPermission(PluginCall call) {
        startService(call);
    }

    private void startService(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, KeepAliveService.class)
            .putExtra(KeepAliveService.EXTRA_TITLE, call.getString("title"))
            .putExtra(KeepAliveService.EXTRA_TEXT, call.getString("text"));
        try {
            ContextCompat.startForegroundService(context, intent);
            call.resolve();
        } catch (Exception e) {
            // Android 12+ no deja arrancarlo desde segundo plano: se reintenta al volver a la app
            call.reject("No se pudo iniciar el servicio", e);
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), KeepAliveService.class));
        call.resolve();
    }

    @PluginMethod
    public void batteryStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("unrestricted", isIgnoringBatteryOptimizations());
        call.resolve(result);
    }

    /** Abre el diálogo del sistema "¿Permitir que la app se ejecute siempre en segundo plano?". */
    @PluginMethod
    public void requestUnrestrictedBattery(PluginCall call) {
        if (!isIgnoringBatteryOptimizations()) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getContext().getPackageName()));
            try {
                getActivity().startActivity(intent);
            } catch (Exception e) {
                // Algunos fabricantes no tienen el diálogo: mandar a la lista de optimización de batería
                getActivity().startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            }
        }
        call.resolve();
    }

    private boolean isIgnoringBatteryOptimizations() {
        PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
        return pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
    }
}
