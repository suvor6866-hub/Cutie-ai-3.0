package com.suvor.cutieai;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Handler;
import android.os.Looper;

public class DeviceControlService extends AccessibilityService {
    private static DeviceControlService instance;
    private boolean playClicked = false;
    private static volatile boolean autoClickEnabled = false;

    public static void armAutoClickAfterSearch() {
        autoClickEnabled = false;
        new Handler(Looper.getMainLooper()).postDelayed(() -> autoClickEnabled = true, 2500);
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null || event.getPackageName() == null) return;

        String packageName = event.getPackageName().toString();

        if (!packageName.equals("com.google.android.youtube")) {
            playClicked = false;
            return;
        }

        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            playClicked = false;
        }

        if (!autoClickEnabled || playClicked) return;

        AccessibilityNodeInfo root = getRootInActiveWindow();
        if (root == null) return;

        if (clickPlayButton(root)) {
            playClicked = true;
            autoClickEnabled = false;
        }
    }

    private boolean clickPlayButton(AccessibilityNodeInfo node) {
        if (node == null) return false;

        CharSequence description = node.getContentDescription();
        CharSequence text = node.getText();
        String label = "";
        if (description != null) label += description.toString() + " ";
        if (text != null) label += text.toString();

        String value = label.trim().toLowerCase();
        boolean isPlay = value.contains("play")
                || value.equals("প্লে")
                || value.equals("চালান")
                || value.equals("play video")
                || value.equals("প্লে ভিডিও");

        if (isPlay) {
            AccessibilityNodeInfo target = node;
            for (int i = 0; i < 5 && target != null; i++) {
                if (target.isClickable()) {
                    return target.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                }
                target = target.getParent();
            }
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            if (clickPlayButton(node.getChild(i))) return true;
        }
        return false;
    }

    @Override
    public void onInterrupt() {
        playClicked = false;
    }

    public static boolean control(String action) {
        if (instance == null) return false;

        switch (action) {
            case "BACK":
                return instance.performGlobalAction(GLOBAL_ACTION_BACK);
            case "HOME":
                return instance.performGlobalAction(GLOBAL_ACTION_HOME);
            default:
                return false;
        }
    }
}
