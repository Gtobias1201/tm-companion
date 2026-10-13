package com.tmcompanion.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Servicio en primer plano mientras hay una partida online abierta. Con él Android no congela
 * la app al apagar la pantalla o pasar a otra app: la conexión con los demás celulares sigue viva.
 * Se ve como una notificación fija ("Partida online en curso") que abre la app al tocarla.
 */
public class KeepAliveService extends Service {

    static final String EXTRA_TITLE = "title";
    static final String EXTRA_TEXT = "text";

    private static final String CHANNEL_ID = "partida-online";
    private static final int NOTIFICATION_ID = 1;
    /** Tope de seguridad por si la app muere sin apagar el servicio. */
    private static final long WAKE_LOCK_TIMEOUT_MS = 8 * 60 * 60 * 1000L;

    private static volatile boolean running = false;

    private PowerManager.WakeLock wakeLock;

    /** Hay una partida online abierta (lo usa MainActivity para no dejar frenar la página). */
    static boolean isRunning() {
        return running;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String title = intent != null ? intent.getStringExtra(EXTRA_TITLE) : null;
        String text = intent != null ? intent.getStringExtra(EXTRA_TEXT) : null;
        Notification notification = buildNotification(
            title != null ? title : "Partida online en curso",
            text != null ? text : "TM Companion sigue conectado con la mesa."
        );
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE ? ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE : 0;
        ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
        running = true;
        acquireWakeLock();
        // Si Android mata el proceso, no tiene sentido revivir el servicio sin la partida
        return START_NOT_STICKY;
    }

    private Notification buildNotification(String title, String text) {
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Partida online", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Aviso fijo mientras la app mantiene la conexión con la mesa");
            channel.setShowBadge(false);
            manager.createNotificationChannel(channel);
        }
        Intent open = new Intent(this, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_planet)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(tap)
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build();
    }

    /** Mantiene el procesador despierto (no la pantalla) para que los mensajes sigan llegando. */
    private void acquireWakeLock() {
        if (wakeLock == null) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "TMCompanion:partida");
            wakeLock.setReferenceCounted(false);
        }
        wakeLock.acquire(WAKE_LOCK_TIMEOUT_MS);
    }

    @Override
    public void onDestroy() {
        running = false;
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
