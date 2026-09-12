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
import android.view.Window
import android.view.WindowManager

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private val saraUrl = "https://muhammadlai.github.io/AitzazAI/"
    private val micRequestCode = 1001

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        window.setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN)

        webView = WebView(this)
        setContentView(webView)

        configureWebView()

        if (android.os.Build.VERSION.SDK_INT >= 23 &&
            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), micRequestCode)
        } else {
            loadSara()
        }
    }

    private fun configureWebView() {
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowContentAccess = true
            allowFileAccess = false
            javaScriptCanOpenWindowsAutomatically = true
            userAgentString = "$userAgentString SARA-Android/1.1"
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean = false
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val audioOnly = request.resources.filter {
                        it == PermissionRequest.RESOURCE_AUDIO_CAPTURE
                    }.toTypedArray()

                    if (audioOnly.isNotEmpty() &&
                        checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                        request.grant(audioOnly)
                    } else {
                        request.deny()
                    }
                }
            }
        }
    }

    private fun loadSara() {
        webView.loadUrl(saraUrl)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == micRequestCode) {
            // Load SARA only after Android has finished the microphone permission flow.
            // This prevents D-ID WebRTC from starting before WebView has microphone access.
            loadSara()
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }

    override fun onDestroy() {
        webView.stopLoading()
        webView.destroy()
        super.onDestroy()
    }
}
