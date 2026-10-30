package com.pingo.halloween;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.webkit.WebView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.FileProvider;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicBoolean;

/** HTTPS + SHA-256 + package/signature verification before handing off to Android. */
final class VerifiedUpdater {
    private final AppCompatActivity activity;
    private final WebView web;
    private final AtomicBoolean busy = new AtomicBoolean();
    VerifiedUpdater(AppCompatActivity activity, WebView web) { this.activity=activity; this.web=web; }
    void download(String source, String expected) {
        if (!busy.compareAndSet(false,true)) { report("error","Ya hay una descarga en curso",0); return; }
        new Thread(() -> {
            File dir = new File(activity.getCacheDir(),"updates");
            File file = new File(dir,"pingo-"+System.currentTimeMillis()+".apk");
            try {
                if(dir.isDirectory()){
                    File[] old=dir.listFiles((d,n)->n.endsWith(".apk"));
                    if(old!=null) for(File f:old) f.delete();
                }
                URI original = new URI(source);
                if (!"https".equals(original.getScheme()) || !"github.com".equals(original.getHost()) || original.getUserInfo()!=null || original.getQuery()!=null || !original.getPath().matches("/Pamtufla/PINGO/releases/download/[^/]+/[^/]+\\.apk") || !expected.matches("(?i)[0-9a-f]{64}")) throw new IOException("Publicación no autorizada");
                URL url=original.toURL(); HttpURLConnection conn=null;
                for(int redirects=0;redirects<6;redirects++) {
                    String host=url.getHost();
                    if (!"https".equals(url.getProtocol()) || !(host.equals("github.com") || host.equals("release-assets.githubusercontent.com") || host.equals("objects.githubusercontent.com"))) throw new IOException("Redirección no autorizada");
                    conn=(HttpURLConnection)url.openConnection();conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(15000);conn.setReadTimeout(30000);
                    int code=conn.getResponseCode();
                    if(code>=300&&code<400){String location=conn.getHeaderField("Location");conn.disconnect();url=new URL(url,location);continue;}
                    if(code!=200)throw new IOException("Servidor no disponible ("+code+")");break;
                }
                if(conn==null||conn.getResponseCode()!=200)throw new IOException("Demasiadas redirecciones");
                long total=conn.getContentLengthLong(),received=0;int last=-1;
                if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("Sin almacenamiento");
                MessageDigest digest=MessageDigest.getInstance("SHA-256");
                try(InputStream in=conn.getInputStream();OutputStream out=new FileOutputStream(file)){
                    byte[] buffer=new byte[32768];int n;
                    while((n=in.read(buffer))!=-1){received+=n;if(received>200L*1024*1024)throw new IOException("Archivo demasiado grande");digest.update(buffer,0,n);out.write(buffer,0,n);int progress=total>0?(int)(received*100/total):0;if(progress>=last+5){report("progress","Descargando APK: "+progress+"%",progress);last=progress;}}
                }finally{conn.disconnect();}
                StringBuilder hex=new StringBuilder();for(byte b:digest.digest())hex.append(String.format("%02x",b&255));
                if(!hex.toString().equalsIgnoreCase(expected))throw new IOException("La integridad SHA-256 no coincide");
                PackageManager pm=activity.getPackageManager();
                int flags=Build.VERSION.SDK_INT>=28?PackageManager.GET_SIGNING_CERTIFICATES:PackageManager.GET_SIGNATURES;
                PackageInfo candidate=pm.getPackageArchiveInfo(file.getAbsolutePath(),flags),installed=pm.getPackageInfo(activity.getPackageName(),flags);
                if(candidate==null||!activity.getPackageName().equals(candidate.packageName))throw new IOException("APK de otra aplicación");
                Signature[] a=Build.VERSION.SDK_INT>=28?candidate.signingInfo.getApkContentsSigners():candidate.signatures;
                Signature[] b=Build.VERSION.SDK_INT>=28?installed.signingInfo.getApkContentsSigners():installed.signatures;
                if(!Arrays.equals(a,b))throw new IOException("Firma del APK no reconocida (desinstala la app antigua e instala de nuevo)");
                long cv=Build.VERSION.SDK_INT>=28?candidate.getLongVersionCode():candidate.versionCode,iv=Build.VERSION.SDK_INT>=28?installed.getLongVersionCode():installed.versionCode;
                if(cv<=iv)throw new IOException("El APK no es más reciente (code "+cv+" ≤ "+iv+")");
                activity.runOnUiThread(()->{
                    try{
                        if (Build.VERSION.SDK_INT >= 26 && !pm.canRequestPackageInstalls()) {
                            report("error","Activa «Instalar apps desconocidas» para Pingo y vuelve a buscar actualización",0);
                            Intent perm=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:"+activity.getPackageName()));
                            perm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            activity.startActivity(perm);
                            return;
                        }
                        Uri uri=FileProvider.getUriForFile(activity,activity.getPackageName()+".fileprovider",file);
                        Intent install=new Intent(Intent.ACTION_VIEW)
                            .setDataAndType(uri,"application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        activity.startActivity(install);
                        report("ready","Confirma «Actualizar» en Android. Luego abre Pingo de nuevo.",100);
                    }catch(Exception e){report("error","No se pudo abrir el instalador: "+e.getMessage(),0);}
                });
            }catch(Exception e){if(file.exists())file.delete();report("error",e.getMessage(),0);}finally{busy.set(false);}
        },"pingo-update").start();
    }
    private void report(String status,String message,int progress){
        activity.runOnUiThread(()->{if(activity.isFinishing()||activity.isDestroyed())return;try{JSONObject detail=new JSONObject().put("status",status).put("message",message).put("progress",progress);web.evaluateJavascript("window.dispatchEvent(new CustomEvent('pingo-download',{detail:"+detail+"}))",null);}catch(Exception ignored){}});
    }
}
