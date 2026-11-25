package com.suvor.cutieai;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "DeviceControl")
public class DeviceControlPlugin extends Plugin {

    @PluginMethod
    public void openYouTubeSearch(PluginCall call) {
        String query = call.getString("query", "বাংলা গান");
        Intent intent = new Intent(
            Intent.ACTION_VIEW,
            Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(query))
        );
        intent.setPackage("com.google.android.youtube");

        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            intent.setPackage(null);
            try {
                getActivity().startActivity(intent);
                call.resolve();
            } catch (Exception error) {
                call.reject("YouTube খোলা যায়নি", error);
            }
        }
    }

    @PluginMethod
    public void control(PluginCall call) {
        String action = call.getString("action", "");
        boolean success = DeviceControlService.control(action);

        if (success) {
            call.resolve();
        } else {
            call.reject("Accessibility Service চালু নেই অথবা কমান্ড কাজ করেনি।");
        }
    }

    @PluginMethod
    public void openAccessibilitySettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
