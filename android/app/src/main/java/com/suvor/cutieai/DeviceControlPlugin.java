package com.suvor.cutieai;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.Settings;
import android.provider.ContactsContract;
import android.provider.Telephony;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "DeviceControl",
    permissions = {
        @Permission(alias = "contacts", strings = {Manifest.permission.READ_CONTACTS}),
        @Permission(alias = "sms", strings = {Manifest.permission.READ_SMS}),
@Permission(alias = "callPhone", strings = {Manifest.permission.CALL_PHONE})
    }
)
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
            DeviceControlService.armAutoClickAfterSearch();
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

    // CONTACT SEARCH
    @PluginMethod
    public void searchContact(PluginCall call) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            requestPermissionForAlias("contacts", call, "contactsCallback");
            return;
        }
        findContact(call);
    }

    @PermissionCallback
    private void contactsCallback(PluginCall call) {
        findContact(call);
    }

    private void findContact(PluginCall call) {
        String name = call.getString("name", "");

        if (name.trim().isEmpty()) {
            call.reject("Contact-এর নাম বলো");
            return;
        }

        Cursor cursor = null;

        try {
            cursor = getContext().getContentResolver().query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[]{
                    ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                    ContactsContract.CommonDataKinds.Phone.NUMBER
                },
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " LIKE ?",
                new String[]{"%" + name + "%"},
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME + " ASC"
            );

            JSArray results = new JSArray();

            if (cursor != null) {
                while (cursor.moveToNext() && results.length() < 10) {
                    JSObject contact = new JSObject();
                    contact.put("name", cursor.getString(0));
                    contact.put("number", cursor.getString(1));
                    results.put(contact);
                }
            }

            JSObject response = new JSObject();
            response.put("contacts", results);
            call.resolve(response);

        } catch (Exception e) {
            call.reject("Contact খুঁজে পাওয়া যায়নি", e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    // DIRECT PHONE CALL WITH ANDROID RUNTIME PERMISSION
    @PluginMethod
    public void dialNumber(PluginCall call) {
        if (getPermissionState("callPhone") != PermissionState.GRANTED) {
            requestPermissionForAlias("callPhone", call, "callPhoneCallback");
            return;
        }
        placeDirectCall(call);
    }

    @PermissionCallback
    private void callPhoneCallback(PluginCall call) {
        if (getPermissionState("callPhone") != PermissionState.GRANTED) {
            call.reject("কল করার Permission Allow করতে হবে");
            return;
        }
        placeDirectCall(call);
    }

    private void placeDirectCall(PluginCall call) {
        String number = call.getString("number", "").trim();
        if (number.isEmpty()) {
            call.reject("ফোন নম্বর পাওয়া যায়নি");
            return;
        }
        try {
            Intent intent = new Intent(
                Intent.ACTION_CALL,
                Uri.fromParts("tel", number, null)
            );
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("সরাসরি কল করা যায়নি", e);
        }
    }

    // OPEN SMS COMPOSER
    @PluginMethod
    public void composeSms(PluginCall call) {
        String number = call.getString("number", "");
        String message = call.getString("message", "");

        if (number.trim().isEmpty() || message.trim().isEmpty()) {
            call.reject("নম্বর অথবা SMS খালি");
            return;
        }

        try {
            Intent intent = new Intent(
                Intent.ACTION_SENDTO,
                Uri.fromParts("smsto", number, null)
            );
            intent.putExtra("sms_body", message);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("SMS অ্যাপ খোলা যায়নি", e);
        }
    }

    // READ INBOX SMS
    @PluginMethod
    public void readLatestSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsCallback");
            return;
        }
        loadSms(call);
    }

    @PermissionCallback
    private void smsCallback(PluginCall call) {
        loadSms(call);
    }

    private void loadSms(PluginCall call) {
        Cursor cursor = null;

        try {
            cursor = getContext().getContentResolver().query(
                Telephony.Sms.Inbox.CONTENT_URI,
                new String[]{
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE
                },
                null,
                null,
                Telephony.Sms.DATE + " DESC"
            );

            JSArray messages = new JSArray();

            if (cursor != null) {
                int count = 0;

                while (cursor.moveToNext() && count < 10) {
                    JSObject sms = new JSObject();
                    sms.put("number", cursor.getString(0));
                    sms.put("message", cursor.getString(1));
                    sms.put("date", cursor.getLong(2));
                    messages.put(sms);
                    count++;
                }
            }

            JSObject response = new JSObject();
            response.put("messages", messages);
            call.resolve(response);

        } catch (Exception e) {
            call.reject("SMS পড়তে সমস্যা হয়েছে", e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }
}
