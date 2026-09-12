package com.sara.creator

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val saraUrl = "https://muhammadlai.github.io/AitzazAI/"
    private val micRequestCode = 1001
    private var pageLoaded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        setContentView(webView)
        configureWebView()
        ensureMicPermissionAndLoad()
    }

    private fun configureWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowContentAccess = true
        settings.allowFileAccess = false
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.userAgentString = "${settings.userAgentString} SARA-Android/1.3.1"

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val wantsAudioPermission = request.resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)
                    val hasAudioPermission = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
                    if (wantsAudioPermission && hasAudioPermission) {
                        request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    } else {
                        request.deny()
                    }
                }
            }
        }
    }

    private fun ensureMicPermissionAndLoad() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            loadSara()
        } else {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), micRequestCode)
        }
    }

    private fun loadSara() {
        if (!pageLoaded) {
            pageLoaded = true
            webView.loadUrl(saraUrl)
        } else {
            webView.reload()
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == micRequestCode) {
            loadSara()
        }
    }

    override fun onResume() {
        super.onResume()
        if (pageLoaded && checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('sara-android-mic-ready'))", null)
        }
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}
