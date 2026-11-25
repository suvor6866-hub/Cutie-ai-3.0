package com.suvor.cutieai;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;

public class DeviceControlService extends AccessibilityService {

    private static DeviceControlService instance;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
    }

    @Override
    public void onInterrupt() {
    }

    public static boolean control(String action) {
        if (instance == null) return false;

        switch (action) {
            case "BACK":
                return instance.performGlobalAction(
                    GLOBAL_ACTION_BACK
                );

            case "HOME":
                return instance.performGlobalAction(
                    GLOBAL_ACTION_HOME
                );

            default:
                return false;
        }
    }
}
