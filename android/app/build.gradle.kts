plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.sara.creator"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.sara.creator"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
    }
}

kotlin { jvmToolchain(17) }

